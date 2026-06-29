import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import type { Offer } from '../types';

function mapOffer(o: any): Offer {
  return {
    id:                 Number(o.id),
    vendorId:           Number(o.vendor_id),
    title:              o.title,
    description:        o.description,
    category:           o.category,
    discountPercent:    Number.parseFloat(o.discount_percent) || 0,
    originalPrice:      Number.parseFloat(o.original_price)   || 0,
    offerPrice:         Number.parseFloat(o.offer_price)       || 0,
    imageUrl:           o.image_url,
    bannerUrl:          o.banner_url,
    couponCode:         o.coupon_code,
    redeemUrl:          o.redeem_url,
    maxRedemptions:     Number.parseInt(o.max_redemptions)    || 0,
    currentRedemptions: Number.parseInt(o.current_redemptions)|| 0,
    validFrom:          o.valid_from,
    validUntil:         o.valid_until,
    isFeatured:         !!o.is_featured,
    isActive:           !!o.is_active,
    views:              Number.parseInt(o.views)  || 0,
    clicks:             Number.parseInt(o.clicks) || 0,
    saves:              Number.parseInt(o.saves)  || 0,
    createdAt:          o.created_at,
    videoUrl:           o.video_url || undefined,
    businessName:       o.business_name,
    vendorLogo:         o.vendor_logo,
    vendorCity:         o.vendor_city,
    vendorAddress:      o.vendor_address || undefined,
    vendorLat:          o.vendor_lat ? Number.parseFloat(o.vendor_lat) : undefined,
    vendorLng:          o.vendor_lng ? Number.parseFloat(o.vendor_lng) : undefined,
    vendorPhone:        o.vendor_phone || undefined,
    vendorEmail:        o.vendor_email || undefined,
    vendorWebsite:      o.vendor_website || undefined,
    vendorCategory:     o.vendor_category || undefined,
    vendorDescription:  o.vendor_description || undefined,
  };
}

// Shared vendor JOIN fragment — keeps all vendor fields in sync
const VENDOR_JOIN = `
  LEFT JOIN vendors v ON o.vendor_id = v.id`;

const VENDOR_COLS = `
  v.business_name, v.logo_url AS vendor_logo, v.city AS vendor_city,
  v.address AS vendor_address, v.lat AS vendor_lat, v.lng AS vendor_lng,
  v.phone AS vendor_phone, v.website AS vendor_website,
  v.category AS vendor_category, v.description AS vendor_description`;

// All active offers with vendor info
export function useOffers(category?: string | null) {
  const sql = category
    ? `SELECT o.*, ${VENDOR_COLS} FROM offers o ${VENDOR_JOIN}
       WHERE o.is_active = 1 AND o.category = ? ORDER BY o.created_at DESC`
    : `SELECT o.*, ${VENDOR_COLS} FROM offers o ${VENDOR_JOIN}
       WHERE o.is_active = 1 ORDER BY o.created_at DESC`;
  const params = category ? [category] : [];
  const { data } = useQuery(sql, params);
  // Memoize on `data` (stable per PowerSync's internal query-diffing) — mapOffer()
  // builds a fresh object each call, which would otherwise create a new array
  // reference every render and break effects/memos downstream that depend on it.
  return useMemo(() => (data ?? []).map(mapOffer), [data]);
}

// Single offer by id with vendor info
export function useOffer(id: number) {
  const { data } = useQuery(
    `SELECT o.*, ${VENDOR_COLS} FROM offers o ${VENDOR_JOIN} WHERE o.id = ?`,
    [id],
  );
  return useMemo(() => (data?.[0] ? mapOffer(data[0]) : null), [data]);
}

// Featured offers with vendor info
export function useFeaturedOffers() {
  const { data } = useQuery(
    `SELECT o.*, ${VENDOR_COLS} FROM offers o ${VENDOR_JOIN}
     WHERE o.is_active = 1 AND o.is_featured = 1 ORDER BY o.created_at DESC`,
  );
  return useMemo(() => (data ?? []).map(mapOffer), [data]);
}

export interface Category { id: number; name: string; slug: string; icon: string; sort_order: number; }

// Categories
export function useCategories(): Category[] {
  const { data } = useQuery(
    'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC',
  );
  return (data ?? []) as Category[];
}

// Saved offer IDs for current user
export function useSavedIds(userId: number) {
  const { data } = useQuery(
    'SELECT offer_id FROM saved_offers WHERE user_id = ?',
    [userId],
  );
  return new Set<number>((data ?? []).map((r: any) => Number(r.offer_id)));
}

// Notifications for current user
export function useNotifications(userId: number) {
  const { data } = useQuery(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId],
  );
  return (data ?? []).map((n: any) => ({
    id:        n.id,
    title:     n.title,
    body:      n.body,
    type:      n.type,
    offerId:   n.offer_id,
    isRead:    !!n.is_read,
    createdAt: n.created_at,
  }));
}

// Vendors (approved only)
export function useVendors() {
  const { data } = useQuery("SELECT * FROM vendors WHERE status = 'approved'");
  return data ?? [];
}

// Vendor dashboard snapshot — instant data from local SQLite
export interface VendorDashboardPS {
  vendor: {
    id: number; business_name: string; city: string; status: string;
    logo_url: string; total_followers: number; subscription_plan: string;
  } | null;
  offerStats: {
    total: number; active: number; inactive: number;
    total_views: number; total_clicks: number; total_saves: number; total_redemptions: number;
  } | null;
  recentOffers: Array<{
    id: number; title: string; category: string; discount_percent: number;
    views: number; clicks: number; saves: number;
    is_active: number; valid_until: string | null;
    current_redemptions: number; max_redemptions: number;
  }>;
  vendorId: number;
}

export function useVendorDashboardPS(userId: number): VendorDashboardPS {
  const { data: vRows } = useQuery<any>(
    'SELECT id, business_name, city, status, logo_url, subscription_plan, total_followers FROM vendors WHERE user_id = ? LIMIT 1',
    [userId],
  );
  const v = vRows?.[0];
  const vendorId = v ? Number(v.id) : -1;

  const { data: sRows } = useQuery<any>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN is_active=0 THEN 1 ELSE 0 END) AS inactive,
            COALESCE(SUM(views),0)               AS total_views,
            COALESCE(SUM(clicks),0)              AS total_clicks,
            COALESCE(SUM(saves),0)               AS total_saves,
            COALESCE(SUM(current_redemptions),0) AS total_redemptions
     FROM offers WHERE vendor_id = ?`,
    [vendorId],
  );

  const { data: rRows } = useQuery<any>(
    `SELECT id, title, category, discount_percent, views, clicks, saves,
            is_active, valid_until, current_redemptions, max_redemptions
     FROM offers WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 5`,
    [vendorId],
  );

  return useMemo(() => ({
    vendorId,
    vendor: v ? {
      id:                  Number(v.id),
      business_name:       v.business_name ?? '',
      city:                v.city ?? '',
      status:              v.status ?? 'pending',
      logo_url:            v.logo_url ?? '',
      total_followers:     Number(v.total_followers) || 0,
      subscription_plan:   v.subscription_plan ?? 'free',
    } : null,
    offerStats: sRows?.[0] ? {
      total:              Number(sRows[0].total)              || 0,
      active:             Number(sRows[0].active)             || 0,
      inactive:           Number(sRows[0].inactive)           || 0,
      total_views:        Number(sRows[0].total_views)        || 0,
      total_clicks:       Number(sRows[0].total_clicks)       || 0,
      total_saves:        Number(sRows[0].total_saves)        || 0,
      total_redemptions:  Number(sRows[0].total_redemptions)  || 0,
    } : null,
    recentOffers: (rRows ?? []).map((o: any) => ({
      id:                  Number(o.id),
      title:               o.title,
      category:            o.category,
      discount_percent:    Number(o.discount_percent) || 0,
      views:               Number(o.views)  || 0,
      clicks:              Number(o.clicks) || 0,
      saves:               Number(o.saves)  || 0,
      is_active:           Number(o.is_active),
      valid_until:         o.valid_until,
      current_redemptions: Number(o.current_redemptions) || 0,
      max_redemptions:     Number(o.max_redemptions)     || 0,
    })),
  }), [v, sRows, rRows]);
}

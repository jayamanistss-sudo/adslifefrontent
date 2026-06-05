import { useQuery } from '@powersync/react';
import type { Offer } from '../types';

function mapOffer(o: any): Offer {
  return {
    id:                 o.id,
    vendorId:           o.vendor_id,
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

// All active offers
export function useOffers(category?: string | null) {
  const sql = category
    ? 'SELECT * FROM offers WHERE is_active = 1 AND category = ? ORDER BY created_at DESC'
    : 'SELECT * FROM offers WHERE is_active = 1 ORDER BY created_at DESC';
  const params = category ? [category] : [];
  const { data } = useQuery(sql, params);
  return (data ?? []).map(mapOffer);
}

// Single offer by id
export function useOffer(id: number) {
  const { data } = useQuery('SELECT * FROM offers WHERE id = ?', [id]);
  return data?.[0] ? mapOffer(data[0]) : null;
}

// Featured offers
export function useFeaturedOffers() {
  const { data } = useQuery(
    'SELECT * FROM offers WHERE is_active = 1 AND is_featured = 1 ORDER BY created_at DESC',
  );
  return (data ?? []).map(mapOffer);
}

// Categories
export function useCategories() {
  const { data } = useQuery(
    'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC',
  );
  return data ?? [];
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

// Vendors
export function useVendors() {
  const { data } = useQuery('SELECT * FROM vendors WHERE status = "approved"');
  return data ?? [];
}

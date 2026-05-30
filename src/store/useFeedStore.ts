import { create } from 'zustand';
import type { Offer } from '../types';
import { api, endpoints } from '../utils/api';

interface FeedState {
  forYouOffers: Offer[];
  trendingOffers: Offer[];
  totalOffers: number;
  page: number;
  perPage: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  activeTab: 'forYou' | 'trending';
  city: string;

  search: string;
  setTab:    (tab: 'forYou' | 'trending') => void;
  setPerPage:(n: number) => void;
  setSearch: (q: string) => void;
  loadFeed:  (userId: number, lat: number, lng: number, page?: number) => Promise<void>;
  loadTrending:(city: string, page?: number) => Promise<void>;
  recordInteraction:(userId: number, offerId: number, action: string) => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  forYouOffers:  [],
  trendingOffers:[],
  totalOffers:   0,
  page:          1,
  perPage:       20,
  totalPages:    1,
  loading:       false,
  error:         null,
  activeTab:     'forYou',
  city:          'Chennai',
  search:        '',

  setTab:    (tab) => set({ activeTab: tab, page: 1 }),
  setSearch: (q)   => set({ search: q, page: 1 }),
  setPerPage: (n)  => set({ perPage: n, page: 1 }),

  loadFeed: async (userId, lat, lng, page) => {
    const { loading, perPage, search } = get();
    if (loading) return;
    const currentPage = page ?? get().page;
    set({ loading: true, error: null });
    try {
      const res = await api.get(endpoints.feed(userId, lat, lng, currentPage, perPage, search));
      if (res.data.success) {
        const offers = mapOffers(res.data.data);
        const total  = res.data.total ?? offers.length;
        set({
          forYouOffers: offers,
          totalOffers:  total,
          totalPages:   Math.max(1, Math.ceil(total / perPage)),
          page:         currentPage,
          loading:      false,
        });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  loadTrending: async (city, page) => {
    const { loading, perPage, search } = get();
    if (loading) return;
    const currentPage = page ?? get().page;
    set({ loading: true });
    try {
      const res = await api.get(endpoints.trending(city, currentPage, perPage, search));
      if (res.data.success) {
        const offers = mapOffers(res.data.data);
        const total  = res.data.total ?? offers.length;
        set({
          trendingOffers: offers,
          totalOffers:    total,
          totalPages:     Math.max(1, Math.ceil(total / perPage)),
          page:           currentPage,
          loading:        false,
          city,
        });
      }
    } catch {
      set({ loading: false });
    }
  },

  recordInteraction: async (userId, offerId, action) => {
    try {
      await api.post(endpoints.interaction, { user_id: userId, offer_id: offerId, action });
    } catch {}
  },
}));

function mapOffers(raw: any[]): Offer[] {
  return raw.map((o: any) => ({
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
    vendorLat:          o.vlat ? Number.parseFloat(o.vlat) : undefined,
    vendorLng:          o.vlng ? Number.parseFloat(o.vlng) : undefined,
    vendorPhone:        o.vendor_phone || undefined,
    vendorEmail:        o.vendor_email || undefined,
    vendorWebsite:      o.vendor_website || undefined,
    distance:           o.distance === undefined ? undefined : Number.parseFloat(o.distance),
    score:              Number.parseFloat(o.score) || undefined,
  }));
}

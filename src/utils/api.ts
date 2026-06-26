import axios from "axios";

function getBaseURL(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  // Auto-detect from hostname so each deployment calls its own backend
  const host = typeof window !== "undefined" ? window.location.hostname : "adslife.in";
  if (host === "dev.adslife.in") return "https://dev.adslife.in/api";
  if (host === "test.adslife.in") return "https://test.adslife.in/api";
  return "https://adslife.in/api";
}
const BASE_URL = getBaseURL();

// Rewrite internal IPs in any URL string returned by the server
const INTERNAL_IP_RE = /http:\/\/160\.250\.224\.242(:\d+)?/g;
const PUBLIC_BASE = "http://103.190.92.21:3001";

function fixUrls(obj: unknown): unknown {
  if (typeof obj === "string") return obj.replace(INTERNAL_IP_RE, PUBLIC_BASE);
  if (Array.isArray(obj)) return obj.map(fixUrls);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, fixUrls(v)]));
  }
  return obj;
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adslife_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (res.data) res.data = fixUrls(res.data);
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("adslife_token");
      localStorage.removeItem("adslife_user");
      if (globalThis.location.pathname !== "/login") {
        globalThis.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

export const endpoints = {
  // Auth
  login: "/auth/login",
  register: "/auth/register",
  googleAuth: "/auth/google",
  becomeVendor: "/auth/become-vendor",
  authProfile: "/auth/profile",
  authMe: "/auth/me",

  // Feed
  feed: (_uid: number, lat: number, lng: number, page = 1, perPage = 20, q = "") =>
    `/feed/personalized?lat=${lat}&lng=${lng}&page=${page}&per_page=${perPage}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
  trending: (city: string, page = 1, perPage = 20, q = "", lat = 13.0827, lng = 80.2707) =>
    `/feed/trending?city=${city}&lat=${lat}&lng=${lng}&page=${page}&per_page=${perPage}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
  nearby: (lat: number, lng: number, radius = 5, page = 1) =>
    `/feed/nearby?lat=${lat}&lng=${lng}&radius=${radius}&page=${page}`,
  interaction: "/feed/interaction",
  savedOffers: (page = 1) => `/feed/saved?page=${page}`,
  savedIds: "/feed/saved-ids",
  unsaveOffer: "/feed/unsave",

  // Offers
  offerDetail: (id: number) => `/offers/${id}`,
  offerView: (id: number) => `/offers/${id}/view`,
  myOffers: "/offers/my/list",
  offerCreate: "/offers",
  offerUpdate: (id: number) => `/offers/${id}`,
  offerDelete: (id: number) => `/offers/${id}`,
  offerReviews: (id: number, page = 1) => `/offers/${id}/reviews?page=${page}`,
  offerReport: (id: number) => `/offers/${id}/report`,

  // Vendor
  vendorDashboard: "/vendor/dashboard",
  vendorProfile: "/vendor/profile",
  vendorFollow: "/vendor/follow",
  vendorFollowStatus: (vendorId: number) => `/vendor/follow-status?vendor_id=${vendorId}`,
  vendorFollowers: (vendorId: number, limit = 20) => `/vendor/${vendorId}/followers?limit=${limit}`,
  vendorFollowing: "/vendor/following",
  vendorMyPlan: "/vendor/my-plan",
  budgetSuggest: (vendorId: number, goal: string, category: string) =>
    `/vendor/budget-suggest?vendor_id=${vendorId}&goal=${goal}&category=${category}`,

  // Vendor apply
  vendorApplySubmit: "/vendor-apply/submit",
  vendorApplyStatus: "/vendor-apply/status",

  // Analytics
  roi: (offerId: number, days = 30) => `/analytics/roi?offer_id=${offerId}&days=${days}`,
  audience: (vendorId?: number, days = 30) =>
    vendorId ? `/analytics/audience?vendor_id=${vendorId}&days=${days}` : `/analytics/audience?days=${days}`,
  heatmap: (vendorId?: number, days = 30) =>
    vendorId ? `/analytics/heatmap?vendor_id=${vendorId}&days=${days}` : `/analytics/heatmap?days=${days}`,
  benchmark: (vendorId?: number) => (vendorId ? `/analytics/benchmark?vendor_id=${vendorId}` : "/analytics/benchmark"),

  // A/B Test
  abCreate: "/ab-test/create",
  abResults: (testId: number) => `/ab-test/${testId}/results`,
  abConclude: (testId: number) => `/ab-test/${testId}/conclude`,

  // Fraud
  fraudCheckVendor: (id: number) => `/fraud/check-vendor/${id}`,
  fraudCheckOffer: (id: number) => `/fraud/check-offer/${id}`,
  fraudFlagged: () => "/fraud/flagged",
  fraudReview: (id: number) => `/fraud/review/${id}`,

  // Targeting
  targetingSet: "/targeting/set",
  targetingResolve: (lat: string, lng: string) => `/targeting/resolve-area?lat=${lat}&lng=${lng}`,
  targetingSearch: (q: string) => `/targeting/search-area?q=${encodeURIComponent(q)}`,

  // Translation
  translateOffer: "/translate/offer",
  translateLanguages: "/translate/languages",

  // Leaderboard
  leaderboard: (city: string, period: string) => `/leaderboard?city=${encodeURIComponent(city)}&period=${period}`,

  // Gamification
  streakStatus: (userId: number) => `/streak/${userId}`,
  badgesUser: (userId: number) => `/badges/user/${userId}`,
  badgesCheck: "/badges/check",

  // Share
  shareTrack: "/share/track",

  // Group Deals
  groupDealsActive: (lat = 13.0827, lng = 80.2707) => `/group-deals/active?lat=${lat}&lng=${lng}`,
  groupDealJoin: (id: number) => `/group-deals/${id}/join`,
  groupDealStatus: (id: number) => `/group-deals/${id}/status`,

  // Spotlight
  spotlightActive: "/spotlight/active",
  spotlightRequest: "/spotlight/request",
  spotlightList: "/spotlight/list",
  spotlightApprove: (id: number) => `/spotlight/${id}/approve`,

  // Notifications
  notificationsList: (limit = 30) => `/notifications?limit=${limit}`,
  notificationsMarkRead: "/notifications/mark-read",

  // Plans
  plansList: "/plans",
  plansCreate: "/plans",
  plansUpdate: (id: number) => `/plans/${id}`,

  // Payment
  paymentCreateOrder: "/payment/create-order",
  paymentVerify: (orderId: string) => `/payment/verify?order_id=${orderId}`,

  // Support tickets
  supportCreate: "/support",
  supportList: (status?: string) => (status ? `/support?status=${status}` : "/support"),
  supportReply: (id: number) => `/support/${id}/reply`,

  // Banner ads
  bannerList: "/banner-ads",
  bannerRequest: "/banner-ads/request",
  bannerReview: (id: number) => `/banner-ads/${id}/review`,

  // Categories
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  categoriesList: (_isAdmin?: boolean) => "/categories",
  categoriesCreate: "/categories",
  categoriesUpdate: (id: number) => `/categories/${id}`,
  categoriesDelete: (id: number) => `/categories/${id}`,

  // Upload
  uploadImage: "/upload/image",

  // Push notifications
  saveToken: "/notifications/save-token",

  // Site settings
  siteSettings: "/admin/site-settings",

  // Admin
  adminStats: "/admin/stats",
  adminUsers: (search = "", status = "", limit = 30, offset = 0) =>
    `/admin/users?search=${encodeURIComponent(search)}&status=${status}&limit=${limit}&offset=${offset}`,
  adminUserAction: (id: number) => `/admin/users/${id}`,
  adminOffers: (search = "", category = "", status = "", limit = 30, offset = 0) =>
    `/admin/offers?search=${encodeURIComponent(search)}&category=${category}&status=${status}&limit=${limit}&offset=${offset}`,
  adminOfferAction: (id: number) => `/admin/offers/${id}`,
  adminVendors: (search = "", status = "", plan = "", limit = 30, offset = 0) =>
    `/admin/vendors?search=${encodeURIComponent(search)}&status=${status}&plan=${plan}&limit=${limit}&offset=${offset}`,
  adminVendorAction: (id: number) => `/admin/vendors/${id}`,
  adminVendorsBulkPlan: "/admin/vendors/bulk-plan",
  adminReviewVendor: (id: number) => `/admin/review-vendor/${id}`,
  adminVendorRequests: () => "/admin/vendor-requests",
  adminBroadcast: "/admin/broadcast",
  adminSpotlight: (status = "") => (status ? `/spotlight/list?status=${status}` : "/spotlight/list"),
  adminSpotlightAction: (id: number) => `/spotlight/${id}/approve`,

  // Referral
  feedCount: "/feed/count",
  referralMy: "/referral/my",

  // Invite
  inviteEmail: "/invite/email",
};

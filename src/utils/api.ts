import axios from "axios";

// Lets App.tsx's boot-time session check opt out of the global 401 redirect
// below (every anonymous visitor hits that 401 once, and shouldn't get
// bounced to /login for it) without an `any` cast at every call site.
declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
  }
}

const currentHost = globalThis.window === undefined ? "adslife.in" : globalThis.window.location.hostname;

function getBaseURL(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (currentHost === "dev.adslife.in") return "https://dev.adslife.in/api";
  if (currentHost === "test.adslife.in") return "https://test.adslife.in/api";
  return "https://adslife.in/api";
}
const BASE_URL = getBaseURL();

// Rewrite internal IPs / localhost URLs returned by the server to the public origin
const LOCALHOST_OR_INTERNAL_RE = /http:\/\/(localhost|127\.0\.0\.1|160\.250\.224\.242)(:\d+)?/g;

export function getPublicOrigin(): string {
  if (currentHost === "dev.adslife.in") return "https://dev.adslife.in";
  if (currentHost === "test.adslife.in") return "https://test.adslife.in";
  return "https://adslife.in";
}

function fixUrls(obj: unknown): unknown {
  if (typeof obj === "string") return obj.replace(LOCALHOST_OR_INTERNAL_RE, getPublicOrigin());
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
  // The JWT now lives only in the httpOnly cookie auth.controller.ts's
  // setAuthCookie() sets on login/register — it already authenticated every
  // request ahead of the Bearer header below, which was a redundant,
  // JS-readable (i.e. XSS-stealable) copy of the same token. withCredentials
  // makes axios actually send that cookie; frontend + API share the same
  // origin here so this doesn't change CORS exposure.
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => {
    if (res.data) res.data = fixUrls(res.data);
    return res;
  },
  (err) => {
    // App.tsx's boot-time session check hits this same 401 path for every
    // anonymous visitor (no cookie yet) — skipAuthRedirect keeps that from
    // bouncing every logged-out user straight to /login.
    if (err.response?.status === 401 && !err.config?.skipAuthRedirect) {
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
  logout: "/auth/logout",
  register: "/auth/register",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  googleAuth: "/auth/google",
  becomeVendor: "/auth/become-vendor",
  authProfile: "/auth/profile",
  authLocation: "/auth/location",
  authMe: "/auth/me",
  authChangePassword: "/auth/change-password",
  emailChangeRequest: "/auth/email-change/request",
  emailChangeConfirm: "/auth/email-change/confirm",

  // Feed  (category / distance / filter / sort applied server-side)
  feed: (_uid: number, lat: number, lng: number, page = 1, perPage = 20, q = "", category = "", distance = 0, filter = "", sort = "") =>
    `/feed/personalized?lat=${lat}&lng=${lng}&page=${page}&per_page=${perPage}${q ? `&q=${encodeURIComponent(q)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}${distance ? `&distance=${distance}` : ""}${filter && filter !== "all" ? `&filter=${filter}` : ""}${sort && sort !== "default" ? `&sort=${sort}` : ""}`,
  trending: (city: string, page = 1, perPage = 20, q = "", lat = 13.0827, lng = 80.2707, category = "", distance = 0, filter = "", sort = "") =>
    `/feed/trending?city=${city}&lat=${lat}&lng=${lng}&page=${page}&per_page=${perPage}${q ? `&q=${encodeURIComponent(q)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}${distance ? `&distance=${distance}` : ""}${filter && filter !== "all" ? `&filter=${filter}` : ""}${sort && sort !== "default" ? `&sort=${sort}` : ""}`,
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
  vendorFollowers: (vendorId: number, limit = 20, page = 1) => `/vendor/${vendorId}/followers?limit=${limit}&page=${page}`,
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
  audienceInteractions: (action: string, vendorId?: number, page = 1) =>
    vendorId
      ? `/analytics/audience/interactions?action=${action}&vendor_id=${vendorId}&page=${page}`
      : `/analytics/audience/interactions?action=${action}&page=${page}`,
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
  fraudFlagged: (status = "", type = "") => `/fraud/flagged?status=${status}&type=${type}`,
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
  leaderboardMe: (city: string, period: string) => `/leaderboard/me?city=${encodeURIComponent(city)}&period=${period}`,

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
  notificationsDelete: (id: number) => `/notifications/${id}`,
  notificationsClear: "/notifications/clear",
  notificationsRemoveToken: "/notifications/token",

  // Plans
  plansList: "/plans",
  plansCreate: "/plans",
  plansUpdate: (id: number) => `/plans/${id}`,
  plansSeed: "/plans/seed",

  // Payment
  paymentCreateOrder: "/payment/create-order",
  paymentVerify: (orderId: string) => `/payment/verify?order_id=${orderId}`,

  // Support tickets
  supportCreate: "/support",
  supportList: (status?: string) => (status ? `/support?status=${status}` : "/support"),
  supportReply: (id: number) => `/support/${id}/reply`,

  // Banner ads
  bannerList: "/banner-ads",
  bannerListMine: "/banner-ads/my",
  bannerListAdmin: "/banner-ads/admin",
  bannerRequest: "/banner-ads/request",
  bannerReview: (id: number) => `/banner-ads/${id}/review`,
  bannerView: (id: number) => `/banner-ads/${id}/view`,
  bannerClick: (id: number) => `/banner-ads/${id}/click`,
  bannerViewers: (id: number, type: "view" | "click", page = 1) =>
    `/banner-ads/${id}/viewers?type=${type}&page=${page}`,

  // Banner plans
  bannerPlansList: "/banner-plans",
  bannerPlansSeed: "/banner-plans/seed",

  // Categories
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  categoriesList: (_isAdmin?: boolean) => "/categories",
  categoriesCreate: "/categories",
  categoriesUpdate: (id: number) => `/categories/${id}`,
  categoriesDelete: (id: number) => `/categories/${id}`,
  categoriesUsage: (id: number) => `/categories/${id}/usage`,
  categoriesSeed: "/categories/seed",

  // Upload
  uploadImage: "/upload/image",
  uploadVideo: "/upload/video",

  // Push notifications
  saveToken: "/notifications/save-token",

  // Site settings
  siteSettings: "/admin/site-settings",

  // Admin
  adminStats: "/admin/stats",
  adminMonitoringOverview: "/admin/monitoring/overview",
  adminMonitoringLogs: (type: string, page = 1, perPage = 30, search = "") =>
    `/admin/monitoring/${type}?page=${page}&per_page=${perPage}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
  adminMonitoringAlerts: (page = 1, perPage = 30) => `/admin/monitoring/alerts?page=${page}&per_page=${perPage}`,
  adminMonitoringAlertRead: (id: number) => `/admin/monitoring/alerts/${id}/read`,
  adminMonitoringSecurityEventResolve: (id: number) => `/admin/monitoring/security-events/${id}/resolve`,
  adminMonitoringBlockedIps: "/admin/monitoring/blocked-ips",
  adminMonitoringBlockIp: "/admin/monitoring/block-ip",
  adminMonitoringUnblockIp: (ip: string) => `/admin/monitoring/block-ip/${encodeURIComponent(ip)}`,
  adminMonitoringExport: (type: string) => `/admin/monitoring/export?type=${type}`,
  adminPayments: (status = "", search = "", page = 1, limit = 30) =>
    `/payment/admin/list?status=${status}&search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`,
  adminPaymentRefund: (id: number) => `/payment/admin/${id}/refund`,
  vendorPayments: (status = "", page = 1, limit = 30) =>
    `/payment/my-list?status=${status}&page=${page}&limit=${limit}`,
  adminAnalyticsLogins: (days = 30) => `/admin/analytics/logins?days=${days}`,
  adminAnalyticsVendorActivity: (days = 30) => `/admin/analytics/vendor-activity?days=${days}`,
  adminAnalyticsGeography: (limit = 10) => `/admin/analytics/geography?limit=${limit}`,
  adminAnalyticsCategories: (limit = 20) => `/admin/analytics/categories?limit=${limit}`,
  adminAnalyticsCampaigns: (days = 30) => `/admin/analytics/campaigns?days=${days}`,
  adminFeedConfig: "/admin/feed-config",
  adminFeedConfigReset: "/admin/feed-config/reset",
  adminUsers: (search = "", status = "", limit = 30, offset = 0) =>
    `/admin/users?search=${encodeURIComponent(search)}&status=${status}&limit=${limit}&offset=${offset}`,
  adminUserAction: (id: number) => `/admin/users/${id}`,
  adminUserDetail: (id: number) => `/admin/users/${id}`,
  adminUserAdminRole: (id: number) => `/admin/users/${id}/admin-role`,
  adminUserForceLogout: (id: number) => `/admin/users/${id}/force-logout`,
  adminOffers: (search = "", category = "", status = "", limit = 30, offset = 0, vendorStatus = "") =>
    `/admin/offers?search=${encodeURIComponent(search)}&category=${category}&status=${status}&limit=${limit}&offset=${offset}&vendorStatus=${vendorStatus}`,
  adminOfferAction: (id: number) => `/admin/offers/${id}`,
  adminOfferEdit: (id: number) => `/admin/offers/${id}/edit`,
  adminVendors: (search = "", status = "", plan = "", limit = 30, offset = 0) =>
    `/admin/vendors?search=${encodeURIComponent(search)}&status=${status}&plan=${plan}&limit=${limit}&offset=${offset}`,
  adminVendorDetail: (id: number) => `/admin/vendors/${id}`,
  adminVendorAction: (id: number) => `/admin/vendors/${id}`,
  adminVendorsBulkPlan: "/admin/vendors/bulk-plan",
  adminReviewVendor: (id: number) => `/admin/review-vendor/${id}`,
  adminVendorRequests: (status = "", page = 1, limit = 30) =>
    `/admin/vendor-requests?status=${status}&page=${page}&limit=${limit}`,
  adminBroadcast: "/admin/broadcast",
  adminSpotlight: (status = "") => (status ? `/spotlight/list?status=${status}` : "/spotlight/list"),
  adminSpotlightAction: (id: number) => `/spotlight/${id}/approve`,
  adminNotificationSettings: "/admin/notification-settings",
  adminNotificationSettingUpdate: (type: string) => `/admin/notification-settings/${type}`,
  notificationTemplates: (type = "") => `/notifications/templates${type ? `?type=${type}` : ""}`,
  notificationTemplateCreate: "/notifications/templates",
  notificationTemplateUpdate: (id: number) => `/notifications/templates/${id}`,
  notificationTemplateDelete: (id: number) => `/notifications/templates/${id}`,
  notificationTemplateGenerate: "/notifications/templates/generate",
  notificationTemplateSeed: "/notifications/templates/seed",
  adminLeaderboardExclude: (userId: number) => `/leaderboard/admin/${userId}/exclude`,
  adminLeaderboardInclude: (userId: number) => `/leaderboard/admin/${userId}/include`,
  adminFeaturedOffers: "/admin/offers/featured",
  adminSetFeatured: (id: number) => `/admin/offers/${id}/featured`,
  adminReorderFeatured: "/admin/offers/featured/reorder",
  adminReviews: (page = 1, limit = 30) => `/admin/reviews?page=${page}&limit=${limit}`,
  adminReviewHide: (id: number) => `/admin/reviews/${id}/hide`,
  adminReviewUnhide: (id: number) => `/admin/reviews/${id}/unhide`,
  adminGroupDeals: (status = "", page = 1, limit = 30) => `/group-deals/admin/list?status=${status}&page=${page}&limit=${limit}`,
  adminGroupDealCancel: (id: number) => `/group-deals/${id}/cancel`,

  // Vendor reviews
  vendorReviews: (page = 1) => `/vendor/reviews?page=${page}`,

  // Referral
  feedCount: "/feed/count",
  referralMy: "/referral/my",

  // Invite
  inviteEmail: "/invite/email",
};

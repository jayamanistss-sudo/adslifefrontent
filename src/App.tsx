import React, { useEffect, Component } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[var(--surface)]">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">Something went wrong</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm">{this.state.message || "An unexpected error occurred."}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, message: "" });
              globalThis.location.href = "/feed";
            }}
            className="btn btn-primary"
          >
            Go back to Feed
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import Layout from "./components/Layout";
import { useUserStore } from "./store/useUserStore";
import { api, endpoints } from "./utils/api";
// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import BecomeVendor from "./pages/BecomeVendor";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import DeleteAccount from "./pages/DeleteAccount";
import Feed from "./pages/Feed";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import OfferDetail from "./pages/OfferDetail";
import VendorProfile from "./pages/VendorProfile";
import OffersMap from "./pages/OffersMap";
import CashfreeTest from "./pages/CashfreeTest";

// Vendor pages
import VendorDashboard from "./pages/vendor/VendorDashboard";
import HeatmapAnalytics from "./pages/vendor/HeatmapAnalytics";
import AudienceInsights from "./pages/vendor/AudienceInsights";
import VendorReviews from "./pages/vendor/VendorReviews";
import VendorPayments from "./pages/vendor/VendorPayments";
import BenchmarkPage from "./pages/vendor/BenchmarkPage";
import ROICalculator from "./pages/vendor/ROICalculator";
import ABTestDashboard from "./pages/vendor/ABTestDashboard";
import NeighborhoodTargeting from "./pages/vendor/NeighborhoodTargeting";
import BudgetSuggester from "./pages/vendor/BudgetSuggester";

// New vendor pages
import ManageOffers from "./pages/vendor/ManageOffers";
import EditVendorProfile from "./pages/vendor/EditVendorProfile";
import BannerAdRequest from "./pages/vendor/BannerAdRequest";
import SupportTickets from "./pages/vendor/SupportTickets";
import SelectPlan from "./pages/vendor/SelectPlan";
import RenewPlan from "./pages/vendor/RenewPlan";

// Admin pages
import FraudDashboard from "./pages/admin/FraudDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import VendorRequests from "./pages/admin/VendorRequests";
import AdminSupportTickets from "./pages/admin/AdminSupportTickets";
import AdminBannerAds from "./pages/admin/AdminBannerAds";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminOffers from "./pages/admin/AdminOffers";
import AdminVendors from "./pages/admin/AdminVendors";
import AdminVendorDetail from "./pages/admin/AdminVendorDetail";
import AdminSpotlight from "./pages/admin/AdminSpotlight";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminGroupDeals from "./pages/admin/AdminGroupDeals";
import AdminSecurityLogs from "./pages/admin/AdminSecurityLogs";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminNotificationTemplates from "./pages/admin/AdminNotificationTemplates";
import AdminLeaderboard from "./pages/admin/AdminLeaderboard";
import AdminFeaturedOffers from "./pages/admin/AdminFeaturedOffers";
import AdminFeedTuning from "./pages/admin/AdminFeedTuning";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminSiteSettings from "./pages/admin/AdminSiteSettings";
import AdminNotificationSettings from "./pages/admin/AdminNotificationSettings";

function ProtectedRoute({ children, roles }: { readonly children: React.ReactNode; readonly roles?: string[] }) {
  const { isAuthenticated, authChecked, user } = useUserStore();

  // The httpOnly cookie isn't JS-readable, so there's no way to know
  // synchronously on first render whether this is a logged-in user
  // refreshing the page or a genuinely logged-out visitor — authChecked
  // only flips true once App's boot-time /auth/me call resolves either way.
  // Redirecting before that would bounce every already-logged-in user to
  // /login on every page load.
  if (!authChecked) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/feed" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setAuthChecked } = useUserStore();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Boot-time session check — the only source of truth for "is this user
  // logged in" now that the JWT lives solely in the httpOnly cookie.
  // Previously gated behind a localStorage-derived isAuthenticated flag and
  // only refreshed already-known-logged-in users' data; now this call
  // itself is what determines isAuthenticated in the first place, for every
  // visitor including anonymous ones (skipAuthRedirect keeps their 401 from
  // bouncing them to /login).
  useEffect(() => {
    api.get(endpoints.authMe, { skipAuthRedirect: true }).then((res) => {
      if (res.data.success) {
        const u = res.data.data;
        setAuthChecked({
          id: u.id,
          name: u.name,
          email: u.email,
          streakDays: Number.parseInt(u.streak_count) || 0,
          role: u.role,
          adminRole: u.admin_role ?? null,
          city: u.city ?? undefined,
          phone: u.phone ?? undefined,
          lat: u.lat != null ? Number.parseFloat(u.lat) : undefined,
          lng: u.lng != null ? Number.parseFloat(u.lng) : undefined,
          avatarUrl: u.avatar_url ?? undefined,
          loginCount: u.login_count,
          emailAlerts: u.email_alerts,
          pushEnabled: u.push_enabled,
        });
      } else {
        setAuthChecked(null);
      }
    }).catch(() => setAuthChecked(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster
          position="top-center"
          containerStyle={{ zIndex: 999999 }}
          toastOptions={{
            duration: 3500,
            style: {
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-lg)',
              fontSize: '0.875rem',
              fontWeight: 500,
              padding: '12px 16px',
              maxWidth: '420px',
            },
            success: {
              iconTheme: { primary: 'var(--accent)', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: 'var(--danger)', secondary: '#fff' },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/become-vendor" element={<BecomeVendor />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/delete-account" element={<DeleteAccount />} />

          {/* Public routes — no login needed */}
          <Route
            path="/"
            element={
              <Layout>
                <Feed />
              </Layout>
            }
          />
          <Route
            path="/feed"
            element={
              <Layout>
                <Feed />
              </Layout>
            }
          />

          {/* Public routes — no login needed */}
          <Route
            path="/offer/:id"
            element={
              <Layout>
                <OfferDetail />
              </Layout>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <Layout>
                <Leaderboard />
              </Layout>
            }
          />
          <Route
            path="/shop/:id"
            element={
              <Layout>
                <VendorProfile />
              </Layout>
            }
          />
          <Route
            path="/map"
            element={
              <Layout>
                <OffersMap />
              </Layout>
            }
          />
          <Route
            path="/pay-test"
            element={
              // Was reachable by any logged-in user — its own comment claims
              // "sandbox keys, no real money moves," but VITE_CASHFREE_ENV is
              // 'production' for both dev and prod builds, so it actually ran
              // live Cashfree charges. Admin-only until it's wired to force
              // sandbox mode regardless of the site-wide env setting.
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <CashfreeTest />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Protected routes — login required */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/dashboard"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <VendorDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/heatmap"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <HeatmapAnalytics />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/audience"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <AudienceInsights />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/reviews"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <VendorReviews />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/payments"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <VendorPayments />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/benchmark"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <BenchmarkPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/roi/:offerId"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <ROICalculator />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/ab-test"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <ABTestDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/targeting"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <NeighborhoodTargeting />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/budget"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <BudgetSuggester />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/offers"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <ManageOffers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/edit-profile"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <EditVendorProfile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/banner-ads"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <BannerAdRequest />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/support"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <SupportTickets />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/select-plan"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <SelectPlan />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendor/renew-plan"
            element={
              <ProtectedRoute roles={["vendor", "admin"]}>
                <Layout>
                  <RenewPlan />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminAnalytics />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/vendor-requests"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <VendorRequests />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/support-tickets"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminSupportTickets />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/banner-ads"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminBannerAds />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fraud"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <FraudDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminUsers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminUserDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/all-offers"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminOffers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/vendors"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminVendors />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/vendors/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminVendorDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/spotlight"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminSpotlight />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminReviews />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/group-deals"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminGroupDeals />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/security-logs"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminSecurityLogs />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminPayments />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notification-templates"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminNotificationTemplates />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leaderboard"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminLeaderboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/featured-offers"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminFeaturedOffers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/feed-tuning"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminFeedTuning />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminCategories />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/subscriptions"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminSubscriptions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/site-settings"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminSiteSettings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notification-settings"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Layout>
                  <AdminNotificationSettings />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

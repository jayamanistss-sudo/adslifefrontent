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
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-white">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">{this.state.message || "An unexpected error occurred."}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, message: "" });
              globalThis.location.href = "/feed";
            }}
            className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
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
import PowerSyncProvider from "./powersync/PowerSyncProvider";
import { useUserStore } from "./store/useUserStore";
// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import BecomeVendor from "./pages/BecomeVendor";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Feed from "./pages/Feed";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import GroupDeals from "./pages/GroupDeals";
import OfferDetail from "./pages/OfferDetail";

// Vendor pages
import VendorDashboard from "./pages/vendor/VendorDashboard";
import HeatmapAnalytics from "./pages/vendor/HeatmapAnalytics";
import AudienceInsights from "./pages/vendor/AudienceInsights";
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
import VendorRequests from "./pages/admin/VendorRequests";
import AdminSupportTickets from "./pages/admin/AdminSupportTickets";
import AdminBannerAds from "./pages/admin/AdminBannerAds";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOffers from "./pages/admin/AdminOffers";
import AdminVendors from "./pages/admin/AdminVendors";
import AdminSpotlight from "./pages/admin/AdminSpotlight";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminSiteSettings from "./pages/admin/AdminSiteSettings";

/** Returns true if the stored JWT is still valid (not expired). */
function isTokenValid(): boolean {
  try {
    const token = localStorage.getItem("adslife_token");
    if (!token) return false;
    const payload = JSON.parse(atob(token.split(".")[1]));
    // exp is in seconds
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function ProtectedRoute({ children, roles }: { readonly children: React.ReactNode; readonly roles?: string[] }) {
  const { isAuthenticated, user, logout } = useUserStore();

  // Token expired — force logout
  if (isAuthenticated && !isTokenValid()) {
    logout();
    return <Navigate to="/login" replace />;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/feed" replace />;
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <PowerSyncProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} containerStyle={{ zIndex: 10001 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/become-vendor" element={<BecomeVendor />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

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

          {/* Protected routes — login required */}
          <Route
            path="/offer/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <OfferDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Leaderboard />
                </Layout>
              </ProtectedRoute>
            }
          />
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
            path="/group-deals"
            element={
              <ProtectedRoute>
                <Layout>
                  <GroupDeals />
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

          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
        </PowerSyncProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

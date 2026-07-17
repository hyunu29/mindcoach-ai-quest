import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import OnboardingPage from "./pages/OnboardingPage";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import TestsPage from "./pages/TestsPage";
import TestTakingPage from "./pages/TestTakingPage";
import ResultsPage from "./pages/ResultsPage";
import CoachingPage from "./pages/CoachingPage";
import EmotionPage from "./pages/EmotionPage";
import HistoryPage from "./pages/HistoryPage";
import ProfilePage from "./pages/ProfilePage";
import MockCheckoutPage from "./pages/MockCheckoutPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentFailPage from "./pages/PaymentFailPage";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminStudentDetailPage from "./pages/admin/AdminStudentDetailPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/payment/mock" element={<MockCheckoutPage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/fail" element={<PaymentFailPage />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/tests" element={<TestsPage />} />
              <Route path="/pricing" element={<Navigate to="/tests" replace />} />
              <Route path="/tests/:id" element={<ProtectedRoute><TestTakingPage /></ProtectedRoute>} />
              <Route path="/results/:id" element={<ResultsPage />} />
              <Route path="/coaching" element={<ProtectedRoute><CoachingPage /></ProtectedRoute>} />
              <Route path="/emotion" element={<ProtectedRoute><EmotionPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            </Route>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<ProtectedRoute requiredUserType="academy_admin"><AdminDashboardPage /></ProtectedRoute>} />
              <Route
                path="/admin/students/:id"
                element={
                  <ProtectedRoute requiredUserType="academy_admin">
                    <AdminStudentDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requiredUserType="academy_admin">
                    <AdminSettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

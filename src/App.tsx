/**
 * @file App.tsx
 * @description 应用根组件 - 路由、上下文与全局布局 - Application Root Component
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */
import { lazy, Suspense } from "react";
import { Toaster } from "./components/ui/toaster.tsx";
import { Toaster as Sonner } from "./components/ui/sonner.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./contexts/AuthContext.tsx";
import { LanguageProvider } from "./contexts/LanguageContext.tsx";
import { OnboardingProvider } from "./components/onboarding/OnboardingProvider.tsx";
import { MainLayout } from "./components/layout/MainLayout.tsx";
import { ModeAwareLayout } from "./components/layout/ModeAwareLayout.tsx";
import { StudioOnlyRoute } from "./components/layout/StudioOnlyRoute.tsx";
import { HackerTransition } from "./components/consumer/HackerTransition.tsx";
import { EjectTransition } from "./components/consumer/EjectTransition.tsx";
import { CommandPalette } from "./components/ui/command-palette.tsx";
import { useAppModeStore } from "./stores/appModeStore.ts";
import Index from "./pages/Index.tsx";
import Landing from "./pages/Landing.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import { Loader2 } from "lucide-react";

// Lazy load heavy pages
const Hive = lazy(() => import("./pages/Hive.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Creator = lazy(() => import("./pages/Creator.tsx"));
const Leaderboard = lazy(() => import("./pages/Leaderboard.tsx"));
const Invite = lazy(() => import("./pages/Invite.tsx"));
const Challenges = lazy(() => import("./pages/Challenges.tsx"));
const ChallengeDetail = lazy(() => import("./pages/ChallengeDetail.tsx"));
const InspirationDetail = lazy(() => import("./pages/InspirationDetail.tsx"));
const Achievements = lazy(() => import("./pages/Achievements.tsx"));
const SharedPrompt = lazy(() => import("./pages/SharedPrompt.tsx"));
const SharedConversation = lazy(() => import("./pages/SharedConversation.tsx"));
const ApiHub = lazy(() => import("./pages/ApiHub.tsx"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess.tsx"));
const WaitingListAdmin = lazy(() => import("./pages/WaitingListAdmin.tsx"));

const queryClient = new QueryClient();

// Redirect helper for /builder/:id → /hive?tab=builder&agentId=:id
function BuilderIdRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/hive?tab=builder&agentId=${id}`} replace />;
}

function AppRoutes() {
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const isGuestMode = sessionStorage.getItem("guestMode") === "true";

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!user && !isGuestMode) {
      return <Navigate to="/landing" replace />;
    }

    return <>{children}</>;
  };

  const AuthRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (user) {
      return <Navigate to="/" replace />;
    }

    return <>{children}</>;
  };

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <Routes>
        {/* Public */}
        <Route path="/landing" element={<Landing />} />
        <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
        <Route path="/share/:token" element={<SharedPrompt />} />
        <Route path="/conversation/:token" element={<SharedConversation />} />

        {/* Dashboard */}
        <Route path="/" element={<ProtectedRoute><ModeAwareLayout /></ProtectedRoute>} />

        {/* HIVE - the main aggregated module */}
        <Route
          path="/hive"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Hive />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Legacy redirects → HIVE */}
        <Route path="/builder" element={<Navigate to="/hive?tab=builder" replace />} />
        <Route path="/builder/:id" element={<BuilderIdRedirect />} />
        <Route path="/knowledge" element={<Navigate to="/hive?tab=knowledge" replace />} />
        <Route path="/foundry" element={<Navigate to="/hive?tab=foundry" replace />} />
        <Route path="/runtime" element={<Navigate to="/hive?tab=runtime" replace />} />

        {/* Other protected pages */}
        <Route path="/leaderboard" element={<ProtectedRoute><MainLayout><Leaderboard /></MainLayout></ProtectedRoute>} />
        <Route path="/creator/:id" element={<ProtectedRoute><MainLayout><Creator /></MainLayout></ProtectedRoute>} />
        <Route path="/api-hub" element={<ProtectedRoute><MainLayout><ApiHub /></MainLayout></ProtectedRoute>} />
        <Route path="/invite" element={<ProtectedRoute><Invite /></ProtectedRoute>} />
        <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
        <Route path="/challenges/:id" element={<ProtectedRoute><ChallengeDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><MainLayout><Profile /></MainLayout></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><MainLayout><Achievements /></MainLayout></ProtectedRoute>} />
        <Route path="/inspiration/:id" element={<ProtectedRoute><InspirationDetail /></ProtectedRoute>} />
        <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
        <Route path="/admin/waiting-list" element={<ProtectedRoute><WaitingListAdmin /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

const App = () => (
  <ErrorBoundary>
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem
      storageKey="theme"
      disableTransitionOnChange
    >
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <OnboardingProvider>
                  <CommandPalette />
                  <AppRoutes />
                </OnboardingProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;

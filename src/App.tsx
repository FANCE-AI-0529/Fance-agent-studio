import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import { ModeAwareLayout } from "@/components/layout/ModeAwareLayout";
import { StudioOnlyRoute } from "@/components/layout/StudioOnlyRoute";
import { HackerTransition } from "@/components/consumer/HackerTransition";
import { EjectTransition } from "@/components/consumer/EjectTransition";
import { useAppModeStore } from "@/stores/appModeStore";
import Index from "./pages/Index";
import Builder from "./pages/Builder";
import Foundry from "./pages/Foundry";
import Runtime from "./pages/Runtime";
import Knowledge from "./pages/Knowledge";
import Profile from "./pages/Profile";
import Creator from "./pages/Creator";
import Leaderboard from "./pages/Leaderboard";
import Invite from "./pages/Invite";
import Challenges from "./pages/Challenges";
import ChallengeDetail from "./pages/ChallengeDetail";
import InspirationDetail from "./pages/InspirationDetail";
import Achievements from "./pages/Achievements";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import SharedPrompt from "./pages/SharedPrompt";
import SharedConversation from "./pages/SharedConversation";
import ApiHub from "./pages/ApiHub";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// These components must be inside AuthProvider, so we define them in AppRoutes
function AppRoutes() {
  // Protected route wrapper
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    // 检查访客模式
    const isGuestMode = sessionStorage.getItem("guestMode") === "true";

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!user && !isGuestMode) {
      return <Navigate to="/auth" replace />;
    }

    return <>{children}</>;
  };

  // Auth route wrapper (redirect if already logged in)
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

  // Mode-aware Runtime layout - no MainLayout wrapper in consumer mode
  const ModeAwareRuntimeLayout = () => {
    const { mode, isTransitioning, ejectContext } = useAppModeStore();
    
    // Use Eject transition if we have context (carrying data between modes)
    if (isTransitioning && ejectContext) {
      return <EjectTransition context={ejectContext} />;
    }
    
    // Regular mode transition
    if (isTransitioning) {
      return <HackerTransition />;
    }
    
    // Consumer mode - Runtime handles its own layout
    if (mode === 'consumer') {
      return <Runtime />;
    }
    
    // Studio mode - wrap with MainLayout
    return (
      <MainLayout>
        <Runtime />
      </MainLayout>
    );
  };

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <Auth />
          </AuthRoute>
        }
      />
      <Route path="/share/:token" element={<SharedPrompt />} />
      <Route path="/conversation/:token" element={<SharedConversation />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ModeAwareLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/builder"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Builder />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/builder/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Builder />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Knowledge />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/foundry"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Foundry />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/runtime"
        element={
          <ProtectedRoute>
            <ModeAwareRuntimeLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Leaderboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/creator/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Creator />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/api-hub"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ApiHub />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/invite"
        element={
          <ProtectedRoute>
            <Invite />
          </ProtectedRoute>
        }
      />
      <Route
        path="/challenges"
        element={
          <ProtectedRoute>
            <Challenges />
          </ProtectedRoute>
        }
      />
      <Route
        path="/challenges/:id"
        element={
          <ProtectedRoute>
            <ChallengeDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Profile />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/achievements"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Achievements />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inspiration/:id"
        element={
          <ProtectedRoute>
            <InspirationDetail />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <OnboardingProvider>
                <AppRoutes />
              </OnboardingProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
);

export default App;

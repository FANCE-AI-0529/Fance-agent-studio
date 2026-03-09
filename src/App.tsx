import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import { ModeAwareLayout } from "@/components/layout/ModeAwareLayout";
import { StudioOnlyRoute } from "@/components/layout/StudioOnlyRoute";
import { HackerTransition } from "@/components/consumer/HackerTransition";
import { EjectTransition } from "@/components/consumer/EjectTransition";
import { CommandPalette } from "@/components/ui/command-palette";
import { useAppModeStore } from "@/stores/appModeStore";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Hive from "./pages/Hive";
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

import PaymentSuccess from "./pages/PaymentSuccess";
import WaitingListAdmin from "./pages/WaitingListAdmin";
import { Loader2 } from "lucide-react";

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
      <Route path="/opencode-test" element={<ProtectedRoute><OpenCodeTestPage /></ProtectedRoute>} />
      <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
      <Route path="/admin/waiting-list" element={<ProtectedRoute><WaitingListAdmin /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

import { ErrorBoundary } from "@/components/ErrorBoundary";

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

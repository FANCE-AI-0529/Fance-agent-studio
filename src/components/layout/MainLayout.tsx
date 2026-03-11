import { ReactNode } from "react";
import { SidebarProvider } from "../ui/sidebar.tsx";
import { AppSidebar } from "./AppSidebar.tsx";
import { MobileBottomNav } from "./MobileBottomNav.tsx";
import { useIsMobile } from "../../hooks/use-mobile.tsx";
import { Menu } from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet.tsx";
import { OnboardingOverlay } from "../onboarding/OnboardingOverlay.tsx";
import { HelpCenter } from "../help/HelpCenter.tsx";
import { LanguageSwitcher } from "../settings/LanguageSwitcher.tsx";
import { ThemeToggle } from "../ThemeToggle.tsx";
import logoIcon from "@/assets/logo-icon.png";

interface MainLayoutProps {
  children: ReactNode;
}

function DesktopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
      <HelpCenter />
      <OnboardingOverlay />
    </div>
  );
}

function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Mobile Header */}
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between flex-shrink-0 safe-area-top">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarProvider defaultOpen>
            <AppSidebar />
          </SidebarProvider>
        </SheetContent>
      </Sheet>
        
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="FANCE" className="w-7 h-7 rounded-lg object-cover" />
          <span className="font-semibold text-sm">FANCE</span>
        </div>
        
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </header>
      
      <main className="flex-1 flex flex-col overflow-hidden pb-16">
        {children}
      </main>

      {/* 底部导航 */}
      <MobileBottomNav />
      
      {/* 帮助中心浮动按钮 */}
      <HelpCenter />
      
      {/* 新手引导 */}
      <OnboardingOverlay />
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return (
    <SidebarProvider defaultOpen>
      <DesktopLayout>{children}</DesktopLayout>
    </SidebarProvider>
  );
}

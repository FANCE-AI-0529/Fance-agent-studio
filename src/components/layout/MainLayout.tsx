import { ReactNode, useEffect } from "react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
    </div>
  );
}

function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Mobile Header */}
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between flex-shrink-0">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <AppSidebar />
          </SheetContent>
        </Sheet>
        
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">A</span>
          </div>
          <span className="font-semibold text-sm">Agent OS</span>
        </div>
        
        <div className="w-9" /> {/* Spacer for centering */}
      </header>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileLayout>{children}</MobileLayout>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <DesktopLayout>{children}</DesktopLayout>
    </SidebarProvider>
  );
}

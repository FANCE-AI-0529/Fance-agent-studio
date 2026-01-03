import { useLocation, useNavigate } from "react-router-dom";
import { Home, Wrench, Trophy, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "首页", labelEn: "Home", icon: Home },
  { path: "/builder", label: "创建", labelEn: "Build", icon: Wrench },
  { path: "/leaderboard", label: "榜单", labelEn: "Rank", icon: Trophy },
  { path: "/runtime", label: "对话", labelEn: "Chat", icon: MessageSquare },
  { path: "/profile", label: "我的", labelEn: "Me", icon: User },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform",
                isActive && "scale-110"
              )} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

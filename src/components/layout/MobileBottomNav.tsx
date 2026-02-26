import { useLocation, useNavigate } from "react-router-dom";
import { Home, Hexagon, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", label: "首页", icon: Home },
  { path: "/hive", label: "HIVE", icon: Hexagon },
  { path: "/hive?tab=runtime", label: "对话", icon: MessageSquare, matchSearch: "tab=runtime" },
  { path: "/profile", label: "我的", icon: User },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          let isActive = false;
          if (item.matchSearch) {
            isActive = location.pathname === "/hive" && location.search.includes(item.matchSearch);
          } else if (item.path === "/") {
            isActive = location.pathname === "/";
          } else {
            isActive = location.pathname.startsWith(item.path) && !item.matchSearch;
          }
          const Icon = item.icon;

          return (
            <button
              key={item.path + (item.matchSearch || "")}
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

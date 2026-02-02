import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Wrench, Hammer, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface NavItem {
  path: string;
  label: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { path: "/", label: "首页", labelEn: "Home", icon: Home },
  { path: "/builder", label: "创建", labelEn: "Build", icon: Wrench },
  { path: "/foundry", label: "工坊", labelEn: "Foundry", icon: Hammer },
  { path: "/runtime", label: "对话", labelEn: "Chat", icon: MessageSquare },
  { path: "/profile", label: "我的", labelEn: "Me", icon: User },
];

export function MobileBottomNavEnhanced() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = useCallback((path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Haptic feedback (if supported)
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleNavClick = useCallback((path: string) => {
    triggerHaptic();
    navigate(path);
  }, [navigate, triggerHaptic]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 w-full h-full",
                "transition-colors touch-manipulation",
                "active:scale-95 transition-transform duration-100"
              )}
              whileTap={{ scale: 0.92 }}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              {/* Active background indicator */}
              <AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="nav-active-bg"
                    className="absolute inset-x-2 top-1 bottom-1 rounded-xl bg-primary/10"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 400, 
                      damping: 30 
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Icon container with animation */}
              <div className="relative z-10">
                <motion.div
                  animate={{
                    scale: active ? 1.15 : 1,
                    y: active ? -2 : 0,
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 25 
                  }}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors duration-200",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </motion.div>

                {/* Active dot indicator */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary"
                      style={{
                        boxShadow: '0 0 8px hsl(var(--primary) / 0.6)',
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Label with animation */}
              <motion.span
                className={cn(
                  "relative z-10 text-[10px] font-medium transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                animate={{
                  fontWeight: active ? 600 : 500,
                  y: active ? 1 : 0,
                }}
                transition={{ duration: 0.15 }}
              >
                {item.label}
              </motion.span>

              {/* Ripple effect on tap */}
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                initial={false}
                whileTap={{
                  backgroundColor: 'hsl(var(--primary) / 0.1)',
                }}
                transition={{ duration: 0.2 }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* iOS home indicator safe area */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

export default MobileBottomNavEnhanced;

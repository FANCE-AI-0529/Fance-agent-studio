import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Helper to disable transitions during theme change
const disableTransitions = () => {
  document.documentElement.classList.add('disable-transitions');
  // Re-enable after a short delay
  setTimeout(() => {
    document.documentElement.classList.remove('disable-transitions');
  }, 100);
};

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    disableTransitions();
    setTheme(newTheme);
  };

  // Show placeholder during SSR/hydration
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={collapsed ? "icon" : "sm"}
        className={collapsed ? "h-8 w-8" : "w-full justify-start gap-2 px-2"}
        disabled
      >
        <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
        {!collapsed && <span className="text-muted-foreground">主题</span>}
      </Button>
    );
  }

  if (collapsed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => {
          disableTransitions();
          if (resolvedTheme === "dark") setTheme("light");
          else if (resolvedTheme === "light") setTheme("system");
          else setTheme("dark");
        }}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">切换主题</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span>主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange("light")}>
          <Sun className="h-4 w-4 mr-2" />
          浅色模式
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
          <Moon className="h-4 w-4 mr-2" />
          深色模式
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")}>
          <Monitor className="h-4 w-4 mr-2" />
          跟随系统
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

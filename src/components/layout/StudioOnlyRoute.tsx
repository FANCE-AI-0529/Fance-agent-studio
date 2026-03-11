import { ReactNode } from "react";
import { useAppModeStore } from "../../stores/appModeStore.ts";
import { motion } from "framer-motion";
import { Terminal, ArrowRight } from "lucide-react";
import { Button } from "../ui/button.tsx";
import { MainLayout } from "./MainLayout.tsx";

interface StudioOnlyRouteProps {
  children: ReactNode;
}

export function StudioOnlyRoute({ children }: StudioOnlyRouteProps) {
  const { mode, toggleMode } = useAppModeStore();

  // If in studio mode, render children normally
  if (mode === 'studio') {
    return <>{children}</>;
  }

  // If in consumer mode, show prompt to switch
  return (
    <MainLayout>
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center"
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Terminal className="h-8 w-8 text-primary" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-foreground mb-3">
            开发者专属功能
          </h2>

          {/* Description */}
          <p className="text-muted-foreground mb-6">
            此功能仅在 Studio 模式下可用。切换到 Studio 模式以访问完整的开发者工具，包括可视化画布、调试面板和高级配置。
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={toggleMode}
              className="gap-2"
            >
              <Terminal className="h-4 w-4" />
              切换到 Studio 模式
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              onClick={() => globalThis.history.back()}
              className="text-muted-foreground"
            >
              返回上一页
            </Button>
          </div>

          {/* Hint */}
          <p className="text-xs text-muted-foreground/60 mt-6">
            提示：你也可以使用快捷键{' '}
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
              Ctrl+Shift+D
            </kbd>
            {' '}随时切换模式
          </p>
        </motion.div>
      </div>
    </MainLayout>
  );
}

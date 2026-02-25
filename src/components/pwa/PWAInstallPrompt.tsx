import React from "react";
import { 
  Download, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Check,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { usePWA } from "@/hooks/usePWA";

interface PWAInstallPromptProps {
  variant?: "banner" | "card" | "inline";
  className?: string;
}

// Banner variant - shows at top/bottom of page
function PWABanner({ className }: { className?: string }) {
  const { isInstallable, installApp, isOnline, isUpdateAvailable, updateApp } = usePWA();

  if (!isInstallable && !isUpdateAvailable) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className={cn(
          "fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96",
          className
        )}
      >
        <Card className="border-primary/50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">
                  {isUpdateAvailable ? "有新版本可用" : "安装 HIVE"}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isUpdateAvailable 
                    ? "刷新页面以获取最新功能" 
                    : "添加到主屏幕，获得原生应用体验"}
                </p>
              </div>
              <Button 
                size="sm"
                onClick={isUpdateAvailable ? updateApp : installApp}
                className="flex-shrink-0"
              >
                {isUpdateAvailable ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    更新
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3 mr-1" />
                    安装
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// Card variant - for settings/about pages
function PWACard({ className }: { className?: string }) {
  const { isInstallable, isInstalled, installApp, isOnline, isUpdateAvailable, updateApp } = usePWA();

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            应用安装
          </CardTitle>
          <Badge 
            variant={isOnline ? "default" : "secondary"} 
            className="gap-1"
          >
            {isOnline ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isOnline ? "在线" : "离线"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Install status */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center",
            isInstalled ? "bg-green-500/10" : "bg-primary/10"
          )}>
            {isInstalled ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Download className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isInstalled ? "已安装" : "未安装"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isInstalled 
                ? "HIVE 已添加到您的设备" 
                : "安装后可离线使用，体验更流畅"}
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border bg-card">
            <Sparkles className="h-4 w-4 text-primary mb-2" />
            <p className="text-xs font-medium">原生体验</p>
            <p className="text-[10px] text-muted-foreground">无浏览器地址栏</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <WifiOff className="h-4 w-4 text-primary mb-2" />
            <p className="text-xs font-medium">离线可用</p>
            <p className="text-[10px] text-muted-foreground">无网络也能访问</p>
          </div>
        </div>

        {/* Install/Update button */}
        {isUpdateAvailable && (
          <Alert className="border-primary/50">
            <RefreshCw className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">有新版本可用</span>
              <Button size="sm" variant="outline" onClick={updateApp}>
                立即更新
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isInstallable && (
          <Button className="w-full" onClick={installApp}>
            <Download className="h-4 w-4 mr-2" />
            安装到设备
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {isInstalled && !isUpdateAvailable && (
          <div className="text-center text-sm text-muted-foreground">
            <Check className="h-4 w-4 inline mr-1 text-green-500" />
            应用已安装并保持最新
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Inline variant - compact for headers/menus
function PWAInline({ className }: { className?: string }) {
  const { isInstallable, installApp, isUpdateAvailable, updateApp } = usePWA();

  if (!isInstallable && !isUpdateAvailable) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("gap-1", className)}
      onClick={isUpdateAvailable ? updateApp : installApp}
    >
      {isUpdateAvailable ? (
        <>
          <RefreshCw className="h-3 w-3" />
          更新
        </>
      ) : (
        <>
          <Download className="h-3 w-3" />
          安装
        </>
      )}
    </Button>
  );
}

// Main export with variant support
export function PWAInstallPrompt({ variant = "banner", className }: PWAInstallPromptProps) {
  switch (variant) {
    case "card":
      return <PWACard className={className} />;
    case "inline":
      return <PWAInline className={className} />;
    case "banner":
    default:
      return <PWABanner className={className} />;
  }
}

// Network status indicator
export function NetworkStatusIndicator({ className }: { className?: string }) {
  const { isOnline } = usePWA();

  return (
    <Badge 
      variant={isOnline ? "outline" : "destructive"} 
      className={cn("gap-1", className)}
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3" />
          在线
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          离线
        </>
      )}
    </Badge>
  );
}

export default PWAInstallPrompt;

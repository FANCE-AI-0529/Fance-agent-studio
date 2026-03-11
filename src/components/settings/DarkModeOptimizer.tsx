import React, { useState, useEffect } from "react";
import { Moon, Sun, Check, Palette, Monitor, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { Switch } from "../ui/switch.tsx";
import { Label } from "../ui/label.tsx";
import { Badge } from "../ui/badge.tsx";
import { Separator } from "../ui/separator.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { useTheme } from "next-themes";
import { cn } from "../../lib/utils.ts";
import { motion } from "framer-motion";

interface ContrastCheck {
  name: string;
  foreground: string;
  background: string;
  ratio: number;
  passes: boolean;
  level: "AAA" | "AA" | "FAIL";
}

interface DarkModeOptimizerProps {
  className?: string;
}

// Calculate relative luminance
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio
function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Parse CSS color to RGB
function parseColor(color: string): [number, number, number] | null {
  // Handle hex
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }
  
  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1]),
      parseInt(rgbMatch[2]),
      parseInt(rgbMatch[3]),
    ];
  }

  // Handle hsl
  const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%?,\s*(\d+)%?/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]);
    const s = parseInt(hslMatch[2]) / 100;
    const l = parseInt(hslMatch[3]) / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  }

  return null;
}

// Get computed style color
function getComputedColor(element: Element, property: string): string {
  return getComputedStyle(element).getPropertyValue(property);
}

// Contrast check component
function ContrastCheckItem({ check }: { check: ContrastCheck }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-3">
        <div 
          className="w-6 h-6 rounded border"
          style={{ backgroundColor: check.background }}
        >
          <span 
            className="text-xs font-bold flex items-center justify-center h-full"
            style={{ color: check.foreground }}
          >
            Aa
          </span>
        </div>
        <span className="text-sm">{check.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {check.ratio.toFixed(2)}:1
        </span>
        <Badge 
          variant={check.level === "AAA" ? "default" : check.level === "AA" ? "secondary" : "destructive"}
          className="text-[10px] px-1.5"
        >
          {check.level}
        </Badge>
      </div>
    </div>
  );
}

// Theme preview component
function ThemePreview({ mode }: { mode: "light" | "dark" }) {
  const isDark = mode === "dark";
  
  return (
    <div 
      className={cn(
        "p-3 rounded-lg border transition-colors",
        isDark ? "bg-zinc-900 border-zinc-700" : "bg-white border-zinc-200"
      )}
    >
      <div className="space-y-2">
        <div className={cn("h-2 w-16 rounded", isDark ? "bg-zinc-700" : "bg-zinc-200")} />
        <div className={cn("h-2 w-24 rounded", isDark ? "bg-zinc-600" : "bg-zinc-300")} />
        <div className="flex gap-2 mt-3">
          <div className={cn("h-6 w-12 rounded", isDark ? "bg-blue-600" : "bg-blue-500")} />
          <div className={cn("h-6 w-12 rounded", isDark ? "bg-zinc-700" : "bg-zinc-200")} />
        </div>
      </div>
    </div>
  );
}

export function DarkModeOptimizer({ className }: DarkModeOptimizerProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [contrastChecks, setContrastChecks] = useState<ContrastCheck[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoSwitch, setAutoSwitch] = useState(false);

  // Run contrast analysis
  const analyzeContrast = async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const checks: ContrastCheck[] = [];
    const root = document.documentElement;

    // Define color pairs to check
    const colorPairs = [
      { name: "主要文本", fg: "--foreground", bg: "--background" },
      { name: "次要文本", fg: "--muted-foreground", bg: "--background" },
      { name: "卡片文本", fg: "--card-foreground", bg: "--card" },
      { name: "主按钮", fg: "--primary-foreground", bg: "--primary" },
      { name: "次按钮", fg: "--secondary-foreground", bg: "--secondary" },
      { name: "破坏性按钮", fg: "--destructive-foreground", bg: "--destructive" },
      { name: "边框对背景", fg: "--border", bg: "--background" },
    ];

    colorPairs.forEach(({ name, fg, bg }) => {
      const fgValue = getComputedStyle(root).getPropertyValue(fg).trim();
      const bgValue = getComputedStyle(root).getPropertyValue(bg).trim();
      
      // Parse HSL values (format: "h s% l%")
      const parseHSL = (value: string): [number, number, number] | null => {
        const parts = value.split(" ");
        if (parts.length >= 3) {
          const h = parseFloat(parts[0]);
          const s = parseFloat(parts[1]) / 100;
          const l = parseFloat(parts[2]) / 100;
          
          const c = (1 - Math.abs(2 * l - 1)) * s;
          const x = c * (1 - Math.abs((h / 60) % 2 - 1));
          const m = l - c / 2;
          
          let r = 0, g = 0, b = 0;
          if (h < 60) { r = c; g = x; }
          else if (h < 120) { r = x; g = c; }
          else if (h < 180) { g = c; b = x; }
          else if (h < 240) { g = x; b = c; }
          else if (h < 300) { r = x; b = c; }
          else { r = c; b = x; }
          
          return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255),
          ];
        }
        return null;
      };

      const fgRgb = parseHSL(fgValue);
      const bgRgb = parseHSL(bgValue);

      if (fgRgb && bgRgb) {
        const fgLum = getLuminance(...fgRgb);
        const bgLum = getLuminance(...bgRgb);
        const ratio = getContrastRatio(fgLum, bgLum);
        
        let level: "AAA" | "AA" | "FAIL" = "FAIL";
        if (ratio >= 7) level = "AAA";
        else if (ratio >= 4.5) level = "AA";

        checks.push({
          name,
          foreground: `rgb(${fgRgb.join(",")})`,
          background: `rgb(${bgRgb.join(",")})`,
          ratio,
          passes: ratio >= 4.5,
          level,
        });
      }
    });

    setContrastChecks(checks);
    setIsAnalyzing(false);
  };

  // Auto-analyze when theme changes
  useEffect(() => {
    analyzeContrast();
  }, [resolvedTheme]);

  // Auto switch based on system preference
  useEffect(() => {
    if (autoSwitch) {
      const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [autoSwitch, setTheme]);

  const passCount = contrastChecks.filter(c => c.passes).length;
  const totalCount = contrastChecks.length;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            深色模式优化
          </CardTitle>
          <Badge 
            variant={passCount === totalCount ? "default" : "secondary"}
            className="gap-1"
          >
            <Check className="h-3 w-3" />
            {passCount}/{totalCount} 通过
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Theme switcher */}
        <div className="flex items-center gap-4">
          <div className="flex-1 grid grid-cols-3 gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => setTheme("light")}
            >
              <Sun className="h-4 w-4" />
              浅色
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-4 w-4" />
              深色
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => setTheme("system")}
            >
              <Monitor className="h-4 w-4" />
              系统
            </Button>
          </div>
        </div>

        {/* Auto switch toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-switch" className="text-sm">
            跟随系统自动切换
          </Label>
          <Switch
            id="auto-switch"
            checked={autoSwitch}
            onCheckedChange={setAutoSwitch}
          />
        </div>

        {/* Theme previews */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">浅色模式</span>
            <ThemePreview mode="light" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">深色模式</span>
            <ThemePreview mode="dark" />
          </div>
        </div>

        <Separator />

        {/* Contrast analysis */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">对比度检查</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={analyzeContrast}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : null}
              重新分析
            </Button>
          </div>

          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {contrastChecks.map((check, index) => (
                <motion.div
                  key={check.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ContrastCheckItem check={check} />
                </motion.div>
              ))}
              {contrastChecks.length === 0 && !isAnalyzing && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  点击"重新分析"开始检查
                </div>
              )}
              {isAnalyzing && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* WCAG info */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <p className="font-medium mb-1">WCAG 对比度标准</p>
          <p>AAA: ≥ 7:1 (最佳) | AA: ≥ 4.5:1 (推荐) | 低于4.5:1可能影响可读性</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default DarkModeOptimizer;

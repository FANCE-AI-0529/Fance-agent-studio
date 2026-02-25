// P3-02: Visual Theme Editor - Customize theme with live preview
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, RotateCcw, Download, Upload, Check, Eye, Moon, Sun, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { scaleVariants, staggerContainer, staggerItem } from "@/lib/animations";

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

interface ThemeColors {
  primary: HSLColor;
  secondary: HSLColor;
  accent: HSLColor;
  background: HSLColor;
  foreground: HSLColor;
  muted: HSLColor;
  card: HSLColor;
  border: HSLColor;
}

interface ThemePreset {
  id: string;
  name: string;
  icon: string;
  colors: ThemeColors;
}

const defaultColors: ThemeColors = {
  primary: { h: 262, s: 83, l: 58 },
  secondary: { h: 240, s: 4.8, l: 95.9 },
  accent: { h: 262, s: 83, l: 58 },
  background: { h: 0, s: 0, l: 100 },
  foreground: { h: 240, s: 10, l: 3.9 },
  muted: { h: 240, s: 4.8, l: 95.9 },
  card: { h: 0, s: 0, l: 100 },
  border: { h: 240, s: 5.9, l: 90 },
};

const themePresets: ThemePreset[] = [
  {
    id: "default",
    name: "默认紫",
    icon: "💜",
    colors: defaultColors,
  },
  {
    id: "ocean",
    name: "海洋蓝",
    icon: "🌊",
    colors: {
      ...defaultColors,
      primary: { h: 210, s: 80, l: 50 },
      accent: { h: 200, s: 90, l: 45 },
    },
  },
  {
    id: "forest",
    name: "森林绿",
    icon: "🌲",
    colors: {
      ...defaultColors,
      primary: { h: 142, s: 70, l: 45 },
      accent: { h: 150, s: 60, l: 40 },
    },
  },
  {
    id: "sunset",
    name: "日落橙",
    icon: "🌅",
    colors: {
      ...defaultColors,
      primary: { h: 25, s: 85, l: 55 },
      accent: { h: 15, s: 90, l: 50 },
    },
  },
  {
    id: "rose",
    name: "玫瑰红",
    icon: "🌹",
    colors: {
      ...defaultColors,
      primary: { h: 340, s: 75, l: 55 },
      accent: { h: 350, s: 80, l: 50 },
    },
  },
  {
    id: "midnight",
    name: "午夜黑",
    icon: "🌙",
    colors: {
      primary: { h: 262, s: 83, l: 58 },
      secondary: { h: 240, s: 10, l: 20 },
      accent: { h: 262, s: 83, l: 58 },
      background: { h: 240, s: 10, l: 10 },
      foreground: { h: 0, s: 0, l: 98 },
      muted: { h: 240, s: 10, l: 20 },
      card: { h: 240, s: 10, l: 12 },
      border: { h: 240, s: 10, l: 20 },
    },
  },
];

const colorLabels: Record<keyof ThemeColors, string> = {
  primary: "主色调",
  secondary: "次要色",
  accent: "强调色",
  background: "背景色",
  foreground: "前景色",
  muted: "柔和色",
  card: "卡片背景",
  border: "边框色",
};

function hslToString(hsl: HSLColor): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

function ColorSlider({ 
  label, 
  value, 
  onChange, 
  colorKey 
}: { 
  label: string; 
  value: HSLColor; 
  onChange: (value: HSLColor) => void;
  colorKey: keyof ThemeColors;
}) {
  const previewStyle = {
    backgroundColor: `hsl(${hslToString(value)})`,
  };

  return (
    <motion.div 
      variants={staggerItem}
      className="space-y-3 p-3 rounded-lg border border-border bg-background/50"
    >
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div 
          className="w-8 h-8 rounded-md border border-border shadow-sm"
          style={previewStyle}
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">H</span>
          <Slider
            value={[value.h]}
            min={0}
            max={360}
            step={1}
            onValueChange={([h]) => onChange({ ...value, h })}
            className="flex-1"
          />
          <Input
            type="number"
            value={value.h}
            onChange={(e) => onChange({ ...value, h: Number(e.target.value) })}
            className="w-16 h-7 text-xs"
            min={0}
            max={360}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">S</span>
          <Slider
            value={[value.s]}
            min={0}
            max={100}
            step={1}
            onValueChange={([s]) => onChange({ ...value, s })}
            className="flex-1"
          />
          <Input
            type="number"
            value={value.s}
            onChange={(e) => onChange({ ...value, s: Number(e.target.value) })}
            className="w-16 h-7 text-xs"
            min={0}
            max={100}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">L</span>
          <Slider
            value={[value.l]}
            min={0}
            max={100}
            step={1}
            onValueChange={([l]) => onChange({ ...value, l })}
            className="flex-1"
          />
          <Input
            type="number"
            value={value.l}
            onChange={(e) => onChange({ ...value, l: Number(e.target.value) })}
            className="w-16 h-7 text-xs"
            min={0}
            max={100}
          />
        </div>
      </div>
    </motion.div>
  );
}

function ThemePreview({ colors }: { colors: ThemeColors }) {
  return (
    <motion.div 
      variants={scaleVariants}
      className="p-4 rounded-xl border-2 border-border"
      style={{ 
        backgroundColor: `hsl(${hslToString(colors.background)})`,
        color: `hsl(${hslToString(colors.foreground)})`,
      }}
    >
      <div className="space-y-4">
        {/* Header Preview */}
        <div 
          className="p-3 rounded-lg"
          style={{ backgroundColor: `hsl(${hslToString(colors.card)})` }}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: `hsl(${hslToString(colors.primary)})` }}
            />
            <div>
              <div className="text-sm font-medium">HIVE</div>
              <div 
                className="text-xs"
                style={{ color: `hsl(${hslToString(colors.muted)})` }}
              >
                主题预览
              </div>
            </div>
          </div>
        </div>

        {/* Buttons Preview */}
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded-md text-sm font-medium text-white"
            style={{ backgroundColor: `hsl(${hslToString(colors.primary)})` }}
          >
            主按钮
          </button>
          <button
            className="px-3 py-1.5 rounded-md text-sm font-medium border"
            style={{ 
              borderColor: `hsl(${hslToString(colors.border)})`,
              backgroundColor: `hsl(${hslToString(colors.secondary)})`,
            }}
          >
            次按钮
          </button>
          <button
            className="px-3 py-1.5 rounded-md text-sm font-medium"
            style={{ 
              backgroundColor: `hsl(${hslToString(colors.accent)})`,
              color: 'white',
            }}
          >
            强调
          </button>
        </div>

        {/* Card Preview */}
        <div 
          className="p-3 rounded-lg border"
          style={{ 
            backgroundColor: `hsl(${hslToString(colors.card)})`,
            borderColor: `hsl(${hslToString(colors.border)})`,
          }}
        >
          <div className="text-sm font-medium mb-1">示例卡片</div>
          <div 
            className="text-xs"
            style={{ color: `hsl(${hslToString(colors.muted)})` }}
          >
            这是一个卡片组件的预览效果
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ThemeEditor() {
  const [colors, setColors] = useState<ThemeColors>(defaultColors);
  const [selectedPreset, setSelectedPreset] = useState<string>("default");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLivePreview, setIsLivePreview] = useState(false);

  const updateColor = useCallback((key: keyof ThemeColors, value: HSLColor) => {
    setColors(prev => ({ ...prev, [key]: value }));
    setSelectedPreset("custom");
  }, []);

  const applyPreset = useCallback((preset: ThemePreset) => {
    setColors(preset.colors);
    setSelectedPreset(preset.id);
  }, []);

  const resetToDefault = useCallback(() => {
    setColors(defaultColors);
    setSelectedPreset("default");
    toast.success("已重置为默认主题");
  }, []);

  const applyTheme = useCallback(() => {
    const root = document.documentElement;
    
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, hslToString(value));
    });
    
    toast.success("主题已应用");
  }, [colors]);

  const exportTheme = useCallback(() => {
    const themeData = JSON.stringify(colors, null, 2);
    const blob = new Blob([themeData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agent-studio-theme.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("主题已导出");
  }, [colors]);

  const importTheme = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setColors(imported);
        setSelectedPreset("custom");
        toast.success("主题已导入");
      } catch {
        toast.error("无效的主题文件");
      }
    };
    reader.readAsText(file);
  }, []);

  // Live preview effect
  useEffect(() => {
    if (isLivePreview) {
      applyTheme();
    }
  }, [isLivePreview, colors, applyTheme]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">主题编辑器</h2>
            <p className="text-sm text-muted-foreground">自定义你的 HIVE 外观</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <Switch 
              checked={isLivePreview} 
              onCheckedChange={setIsLivePreview}
              id="live-preview"
            />
            <Label htmlFor="live-preview" className="text-sm">实时预览</Label>
          </div>
          
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-1" />
            重置
          </Button>
          <Button variant="outline" size="sm" onClick={exportTheme}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label>
              <Upload className="h-4 w-4 mr-1" />
              导入
              <input 
                type="file" 
                accept=".json" 
                onChange={importTheme} 
                className="hidden" 
              />
            </label>
          </Button>
          {!isLivePreview && (
            <Button size="sm" onClick={applyTheme}>
              <Check className="h-4 w-4 mr-1" />
              应用主题
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Presets */}
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                主题预设
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {themePresets.map((preset) => (
                  <motion.button
                    key={preset.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => applyPreset(preset)}
                    className={`
                      p-3 rounded-lg border-2 text-left transition-colors
                      ${selectedPreset === preset.id 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                      }
                    `}
                  >
                    <span className="text-xl mb-1 block">{preset.icon}</span>
                    <span className="text-sm font-medium">{preset.name}</span>
                  </motion.button>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    <Label>暗色模式</Label>
                  </div>
                  <Switch 
                    checked={isDarkMode} 
                    onCheckedChange={setIsDarkMode}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Color Editor */}
        <motion.div variants={staggerItem} className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                颜色编辑
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="primary" className="w-full">
                <TabsList className="w-full grid grid-cols-4 h-8">
                  <TabsTrigger value="primary" className="text-xs">主色</TabsTrigger>
                  <TabsTrigger value="background" className="text-xs">背景</TabsTrigger>
                  <TabsTrigger value="ui" className="text-xs">UI</TabsTrigger>
                  <TabsTrigger value="text" className="text-xs">文字</TabsTrigger>
                </TabsList>
                
                <TabsContent value="primary" className="space-y-3 mt-3">
                  <ColorSlider
                    label={colorLabels.primary}
                    value={colors.primary}
                    onChange={(v) => updateColor("primary", v)}
                    colorKey="primary"
                  />
                  <ColorSlider
                    label={colorLabels.accent}
                    value={colors.accent}
                    onChange={(v) => updateColor("accent", v)}
                    colorKey="accent"
                  />
                </TabsContent>
                
                <TabsContent value="background" className="space-y-3 mt-3">
                  <ColorSlider
                    label={colorLabels.background}
                    value={colors.background}
                    onChange={(v) => updateColor("background", v)}
                    colorKey="background"
                  />
                  <ColorSlider
                    label={colorLabels.card}
                    value={colors.card}
                    onChange={(v) => updateColor("card", v)}
                    colorKey="card"
                  />
                </TabsContent>
                
                <TabsContent value="ui" className="space-y-3 mt-3">
                  <ColorSlider
                    label={colorLabels.secondary}
                    value={colors.secondary}
                    onChange={(v) => updateColor("secondary", v)}
                    colorKey="secondary"
                  />
                  <ColorSlider
                    label={colorLabels.border}
                    value={colors.border}
                    onChange={(v) => updateColor("border", v)}
                    colorKey="border"
                  />
                </TabsContent>
                
                <TabsContent value="text" className="space-y-3 mt-3">
                  <ColorSlider
                    label={colorLabels.foreground}
                    value={colors.foreground}
                    onChange={(v) => updateColor("foreground", v)}
                    colorKey="foreground"
                  />
                  <ColorSlider
                    label={colorLabels.muted}
                    value={colors.muted}
                    onChange={(v) => updateColor("muted", v)}
                    colorKey="muted"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preview */}
        <motion.div variants={staggerItem}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                效果预览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThemePreview colors={colors} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

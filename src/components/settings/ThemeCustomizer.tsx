/**
 * @file ThemeCustomizer.tsx
 * @description 主题自定义组件
 */

import { useState, useEffect } from 'react';
import { 
  Palette, 
  Sun, 
  Moon, 
  Monitor,
  Check,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface ThemeCustomizerProps {
  onClose?: () => void;
}

// 预设主题色
const presetColors = [
  { name: '默认', hue: 262, saturation: 83 },
  { name: '海洋', hue: 199, saturation: 89 },
  { name: '森林', hue: 142, saturation: 76 },
  { name: '日落', hue: 25, saturation: 95 },
  { name: '樱花', hue: 330, saturation: 81 },
  { name: '薰衣草', hue: 270, saturation: 67 },
];

// 获取/设置 CSS 变量
function getCSSVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function setCSSVariable(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

export function ThemeCustomizer({ onClose }: ThemeCustomizerProps) {
  const { theme, setTheme } = useTheme();
  const [primaryHue, setPrimaryHue] = useState(262);
  const [primarySaturation, setPrimarySaturation] = useState(83);
  const [borderRadius, setBorderRadius] = useState(0.5);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>('默认');

  // 加载已保存的设置
  useEffect(() => {
    const saved = localStorage.getItem('theme-customization');
    if (saved) {
      const settings = JSON.parse(saved);
      setPrimaryHue(settings.primaryHue || 262);
      setPrimarySaturation(settings.primarySaturation || 83);
      setBorderRadius(settings.borderRadius || 0.5);
      setReduceMotion(settings.reduceMotion || false);
      setSelectedPreset(settings.selectedPreset || null);
      applyTheme(settings);
    }
  }, []);

  // 应用主题
  const applyTheme = (settings: {
    primaryHue: number;
    primarySaturation: number;
    borderRadius: number;
    reduceMotion: boolean;
  }) => {
    // 更新主色调
    setCSSVariable('--primary', `${settings.primaryHue} ${settings.primarySaturation}% 50%`);
    
    // 更新圆角
    setCSSVariable('--radius', `${settings.borderRadius}rem`);

    // 动画减弱
    if (settings.reduceMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  };

  // 保存设置
  const saveSettings = () => {
    const settings = {
      primaryHue,
      primarySaturation,
      borderRadius,
      reduceMotion,
      selectedPreset,
    };
    localStorage.setItem('theme-customization', JSON.stringify(settings));
    applyTheme(settings);
  };

  // 应用预设
  const applyPreset = (preset: typeof presetColors[0]) => {
    setPrimaryHue(preset.hue);
    setPrimarySaturation(preset.saturation);
    setSelectedPreset(preset.name);
    applyTheme({
      primaryHue: preset.hue,
      primarySaturation: preset.saturation,
      borderRadius,
      reduceMotion,
    });
  };

  // 重置为默认
  const resetToDefault = () => {
    const defaultSettings = {
      primaryHue: 262,
      primarySaturation: 83,
      borderRadius: 0.5,
      reduceMotion: false,
    };
    setPrimaryHue(defaultSettings.primaryHue);
    setPrimarySaturation(defaultSettings.primarySaturation);
    setBorderRadius(defaultSettings.borderRadius);
    setReduceMotion(defaultSettings.reduceMotion);
    setSelectedPreset('默认');
    localStorage.removeItem('theme-customization');
    applyTheme(defaultSettings);
  };

  // 实时预览
  useEffect(() => {
    applyTheme({
      primaryHue,
      primarySaturation,
      borderRadius,
      reduceMotion,
    });
  }, [primaryHue, primarySaturation, borderRadius, reduceMotion]);

  return (
    <div className="space-y-4">
      {/* 主题模式 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4" />
            外观模式
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme}
            onValueChange={setTheme}
            className="grid grid-cols-3 gap-2"
          >
            <Label
              htmlFor="light"
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                theme === 'light' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/50'
              )}
            >
              <RadioGroupItem value="light" id="light" className="sr-only" />
              <Sun className="h-5 w-5" />
              <span className="text-xs">浅色</span>
            </Label>
            <Label
              htmlFor="dark"
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                theme === 'dark' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/50'
              )}
            >
              <RadioGroupItem value="dark" id="dark" className="sr-only" />
              <Moon className="h-5 w-5" />
              <span className="text-xs">深色</span>
            </Label>
            <Label
              htmlFor="system"
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                theme === 'system' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/50'
              )}
            >
              <RadioGroupItem value="system" id="system" className="sr-only" />
              <Monitor className="h-5 w-5" />
              <span className="text-xs">跟随系统</span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 主题色预设 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">主题色</CardTitle>
          <CardDescription className="text-xs">选择预设或自定义主色调</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 预设颜色 */}
          <div className="grid grid-cols-6 gap-2">
            {presetColors.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={cn(
                  'w-full aspect-square rounded-lg border-2 transition-all relative',
                  selectedPreset === preset.name ? 'border-foreground scale-110' : 'border-transparent'
                )}
                style={{
                  backgroundColor: `hsl(${preset.hue}, ${preset.saturation}%, 50%)`,
                }}
                title={preset.name}
              >
                {selectedPreset === preset.name && (
                  <Check className="h-3 w-3 text-white absolute inset-0 m-auto" />
                )}
              </button>
            ))}
          </div>

          {/* 自定义调节 */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">色相</Label>
                <span className="text-xs text-muted-foreground">{primaryHue}°</span>
              </div>
              <Slider
                value={[primaryHue]}
                onValueChange={([value]) => {
                  setPrimaryHue(value);
                  setSelectedPreset(null);
                }}
                min={0}
                max={360}
                step={1}
                className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(0, 80%, 50%), 
                    hsl(60, 80%, 50%), 
                    hsl(120, 80%, 50%), 
                    hsl(180, 80%, 50%), 
                    hsl(240, 80%, 50%), 
                    hsl(300, 80%, 50%), 
                    hsl(360, 80%, 50%))`,
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">饱和度</Label>
                <span className="text-xs text-muted-foreground">{primarySaturation}%</span>
              </div>
              <Slider
                value={[primarySaturation]}
                onValueChange={([value]) => {
                  setPrimarySaturation(value);
                  setSelectedPreset(null);
                }}
                min={0}
                max={100}
                step={1}
                className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
              />
            </div>
          </div>

          {/* 预览 */}
          <div 
            className="h-8 rounded-lg"
            style={{
              backgroundColor: `hsl(${primaryHue}, ${primarySaturation}%, 50%)`,
            }}
          />
        </CardContent>
      </Card>

      {/* 界面设置 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            界面设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 圆角 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">圆角大小</Label>
              <span className="text-xs text-muted-foreground">{borderRadius}rem</span>
            </div>
            <Slider
              value={[borderRadius]}
              onValueChange={([value]) => setBorderRadius(value)}
              min={0}
              max={1}
              step={0.1}
              className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
            />
            <div className="flex gap-2">
              {[0, 0.3, 0.5, 0.75, 1].map((radius) => (
                <div
                  key={radius}
                  className="flex-1 h-8 bg-muted border"
                  style={{ borderRadius: `${radius}rem` }}
                />
              ))}
            </div>
          </div>

          {/* 减少动画 */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">减少动画</Label>
              <p className="text-xs text-muted-foreground">减少界面动画效果</p>
            </div>
            <Switch
              checked={reduceMotion}
              onCheckedChange={setReduceMotion}
            />
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={resetToDefault} className="flex-1">
          <RotateCcw className="h-3 w-3 mr-1" />
          重置默认
        </Button>
        <Button size="sm" onClick={saveSettings} className="flex-1">
          <Check className="h-3 w-3 mr-1" />
          保存设置
        </Button>
      </div>
    </div>
  );
}

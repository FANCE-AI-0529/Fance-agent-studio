/**
 * @file LayoutDensity.tsx
 * @description 布局密度设置组件
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Square,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

// 密度类型
export type DensityLevel = 'compact' | 'standard' | 'comfortable';

// 密度配置
const densityConfig: Record<DensityLevel, {
  label: string;
  description: string;
  icon: React.ElementType;
  spacing: number;
  fontSize: number;
}> = {
  compact: {
    label: '紧凑',
    description: '更多内容，更少空间',
    icon: Minimize2,
    spacing: 0.75,
    fontSize: 0.875,
  },
  standard: {
    label: '标准',
    description: '平衡的信息密度',
    icon: Square,
    spacing: 1,
    fontSize: 1,
  },
  comfortable: {
    label: '宽松',
    description: '更大的间距，易于阅读',
    icon: Maximize2,
    spacing: 1.25,
    fontSize: 1.125,
  },
};

// Context
interface LayoutDensityContextType {
  density: DensityLevel;
  setDensity: (density: DensityLevel) => void;
  spacing: number;
  fontSize: number;
}

const LayoutDensityContext = createContext<LayoutDensityContextType | undefined>(undefined);

export function useLayoutDensity() {
  const context = useContext(LayoutDensityContext);
  if (!context) {
    throw new Error('useLayoutDensity must be used within LayoutDensityProvider');
  }
  return context;
}

// Provider
export function LayoutDensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<DensityLevel>(() => {
    const saved = localStorage.getItem('layout-density');
    return (saved as DensityLevel) || 'standard';
  });

  const config = densityConfig[density];

  const setDensity = (newDensity: DensityLevel) => {
    setDensityState(newDensity);
    localStorage.setItem('layout-density', newDensity);
    
    // 应用 CSS 变量
    const newConfig = densityConfig[newDensity];
    document.documentElement.style.setProperty('--density-spacing', String(newConfig.spacing));
    document.documentElement.style.setProperty('--density-font-size', String(newConfig.fontSize));
    document.documentElement.setAttribute('data-density', newDensity);
  };

  // 初始化
  useEffect(() => {
    setDensity(density);
  }, []);

  return (
    <LayoutDensityContext.Provider
      value={{
        density,
        setDensity,
        spacing: config.spacing,
        fontSize: config.fontSize,
      }}
    >
      {children}
    </LayoutDensityContext.Provider>
  );
}

// 设置组件
interface LayoutDensitySettingsProps {
  onChange?: (density: DensityLevel) => void;
}

export function LayoutDensitySettings({ onChange }: LayoutDensitySettingsProps) {
  const { density, setDensity } = useLayoutDensity();

  const handleChange = (value: DensityLevel) => {
    setDensity(value);
    onChange?.(value);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">布局密度</CardTitle>
        <CardDescription className="text-xs">调整界面信息密度</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={density}
          onValueChange={(v) => handleChange(v as DensityLevel)}
          className="space-y-2"
        >
          {(Object.entries(densityConfig) as [DensityLevel, typeof densityConfig.standard][]).map(
            ([key, config]) => {
              const Icon = config.icon;
              const isSelected = density === key;

              return (
                <Label
                  key={key}
                  htmlFor={key}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                    isSelected ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/50 hover:bg-muted'
                  )}
                >
                  <RadioGroupItem value={key} id={key} className="sr-only" />
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{config.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                </Label>
              );
            }
          )}
        </RadioGroup>

        {/* 预览 */}
        <div className="mt-4 p-3 rounded-lg border">
          <p className="text-xs text-muted-foreground mb-2">预览效果</p>
          <div 
            className="space-y-2"
            style={{
              fontSize: `${densityConfig[density].fontSize}rem`,
            }}
          >
            <div 
              className="p-2 bg-muted rounded"
              style={{
                padding: `${densityConfig[density].spacing * 0.5}rem`,
              }}
            >
              示例文本行 1
            </div>
            <div 
              className="p-2 bg-muted rounded"
              style={{
                padding: `${densityConfig[density].spacing * 0.5}rem`,
              }}
            >
              示例文本行 2
            </div>
            <div 
              className="p-2 bg-muted rounded"
              style={{
                padding: `${densityConfig[density].spacing * 0.5}rem`,
              }}
            >
              示例文本行 3
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 密度感知的间距组件
interface DensitySpacerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DensitySpacer({ size = 'md', className }: DensitySpacerProps) {
  const { spacing } = useLayoutDensity();
  
  const sizeMultiplier = {
    sm: 0.5,
    md: 1,
    lg: 2,
  };

  return (
    <div 
      className={className}
      style={{ height: `${spacing * sizeMultiplier[size]}rem` }}
    />
  );
}

// 密度感知的容器
interface DensityContainerProps {
  children: ReactNode;
  className?: string;
}

export function DensityContainer({ children, className }: DensityContainerProps) {
  const { spacing, fontSize } = useLayoutDensity();

  return (
    <div 
      className={cn('transition-all', className)}
      style={{
        padding: `${spacing}rem`,
        fontSize: `${fontSize}rem`,
        gap: `${spacing * 0.5}rem`,
      }}
    >
      {children}
    </div>
  );
}

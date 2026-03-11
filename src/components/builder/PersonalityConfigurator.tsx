import React from "react";
import { Slider } from "../ui/slider.tsx";
import { Button } from "../ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.tsx";
import { Briefcase, FileText, Smile, Lightbulb, RotateCcw } from "lucide-react";
import { cn } from "../../lib/utils.ts";
import {
  PersonalityConfig,
  personalityPresets,
  personalityDimensions,
  getDefaultPersonalityConfig
} from "../../utils/personalityToPrompt.ts";

interface PersonalityConfiguratorProps {
  config: PersonalityConfig;
  onChange: (config: PersonalityConfig) => void;
  compact?: boolean;
}

const iconMap = {
  Briefcase,
  FileText,
  Smile,
  Lightbulb
};

const PersonalityConfigurator: React.FC<PersonalityConfiguratorProps> = ({
  config,
  onChange,
  compact = false
}) => {
  const handleSliderChange = (key: keyof PersonalityConfig, value: number[]) => {
    onChange({
      ...config,
      [key]: value[0],
      preset: undefined // Clear preset when manually adjusting
    });
  };

  const applyPreset = (presetKey: string) => {
    const preset = personalityPresets[presetKey];
    if (preset) {
      onChange(preset.config);
    }
  };

  const resetToDefault = () => {
    onChange(getDefaultPersonalityConfig());
  };

  const currentPreset = config.preset ? personalityPresets[config.preset] : null;

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">性格设定</span>
          {currentPreset && (
            <Badge variant="secondary" className="text-xs">
              {currentPreset.icon} {currentPreset.name}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(personalityPresets).map(([key, preset]) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Button
                  variant={config.preset === key ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => applyPreset(key)}
                >
                  {preset.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{preset.name}</p>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Smile className="h-4 w-4 text-primary" />
            性格设定
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefault}
            className="h-7 text-xs text-muted-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            重置
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Preset Templates */}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">快速应用预设</span>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(personalityPresets).map(([key, preset]) => (
              <Button
                key={key}
                variant={config.preset === key ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-auto py-2 flex flex-col items-center gap-1",
                  config.preset === key && "ring-2 ring-primary/20"
                )}
                onClick={() => applyPreset(key)}
              >
                <span className="text-lg">{preset.icon}</span>
                <span className="text-xs">{preset.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Dimension Sliders */}
        <div className="space-y-4 pt-2">
          <span className="text-sm text-muted-foreground">精细调整</span>
          {personalityDimensions.map((dim) => {
            const Icon = iconMap[dim.icon as keyof typeof iconMap];
            const value = config[dim.key] as number;
            
            return (
              <div key={dim.key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{dim.leftLabel}</span>
                  </div>
                  <span className="text-muted-foreground">{dim.rightLabel}</span>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={(v) => handleSliderChange(dim.key, v)}
                  max={1}
                  step={0.05}
                  className="cursor-pointer"
                />
                <div className="flex justify-center">
                  <span className="text-xs text-muted-foreground/70">
                    {Math.round(value * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Preset Indicator */}
        {currentPreset && (
          <div className="pt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>当前：</span>
            <Badge variant="secondary">
              {currentPreset.icon} {currentPreset.name}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonalityConfigurator;

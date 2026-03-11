import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import { Badge } from "../ui/badge.tsx";
import { Sparkles, Zap, Brain, Rocket } from "lucide-react";
import { cn } from "../../lib/utils.ts";

export interface AIModel {
  id: string;
  name: string;
  provider: "google" | "openai";
  description: string;
  speed: "fast" | "medium" | "slow";
  quality: "standard" | "high" | "premium";
  icon: React.ReactNode;
}

export const availableModels: AIModel[] = [
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    description: "快速响应，平衡质量与速度",
    speed: "fast",
    quality: "high",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    description: "顶级推理能力，适合复杂任务",
    speed: "medium",
    quality: "premium",
    icon: <Brain className="h-4 w-4" />,
  },
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "google",
    description: "最快速度，适合简单任务",
    speed: "fast",
    quality: "standard",
    icon: <Rocket className="h-4 w-4" />,
  },
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    provider: "openai",
    description: "强大全能，卓越推理能力",
    speed: "slow",
    quality: "premium",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openai",
    description: "性价比之选，保持强大能力",
    speed: "medium",
    quality: "high",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "openai",
    description: "极速响应，高效节省",
    speed: "fast",
    quality: "standard",
    icon: <Sparkles className="h-4 w-4" />,
  },
];

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({ value, onChange, disabled, className }: ModelSelectorProps) {
  const selectedModel = availableModels.find(m => m.id === value) || availableModels[0];

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn("w-[200px] h-8 text-xs", className)}>
        <SelectValue>
          <div className="flex items-center gap-2">
            {selectedModel.icon}
            <span>{selectedModel.name}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Google Gemini
        </div>
        {availableModels
          .filter(m => m.provider === "google")
          .map(model => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-2">
                {model.icon}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.name}</span>
                    <div className="flex gap-1">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[9px] px-1 py-0 h-3.5",
                          model.speed === "fast" && "border-green-500/50 text-green-600",
                          model.speed === "medium" && "border-yellow-500/50 text-yellow-600",
                          model.speed === "slow" && "border-orange-500/50 text-orange-600"
                        )}
                      >
                        {model.speed === "fast" ? "快速" : model.speed === "medium" ? "中速" : "较慢"}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[9px] px-1 py-0 h-3.5",
                          model.quality === "premium" && "border-purple-500/50 text-purple-600",
                          model.quality === "high" && "border-blue-500/50 text-blue-600",
                          model.quality === "standard" && "border-muted-foreground/50 text-muted-foreground"
                        )}
                      >
                        {model.quality === "premium" ? "顶级" : model.quality === "high" ? "高质量" : "标准"}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{model.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide border-t mt-1 pt-2">
          OpenAI GPT
        </div>
        {availableModels
          .filter(m => m.provider === "openai")
          .map(model => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-2">
                {model.icon}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.name}</span>
                    <div className="flex gap-1">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[9px] px-1 py-0 h-3.5",
                          model.speed === "fast" && "border-green-500/50 text-green-600",
                          model.speed === "medium" && "border-yellow-500/50 text-yellow-600",
                          model.speed === "slow" && "border-orange-500/50 text-orange-600"
                        )}
                      >
                        {model.speed === "fast" ? "快速" : model.speed === "medium" ? "中速" : "较慢"}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[9px] px-1 py-0 h-3.5",
                          model.quality === "premium" && "border-purple-500/50 text-purple-600",
                          model.quality === "high" && "border-blue-500/50 text-blue-600",
                          model.quality === "standard" && "border-muted-foreground/50 text-muted-foreground"
                        )}
                      >
                        {model.quality === "premium" ? "顶级" : model.quality === "high" ? "高质量" : "标准"}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{model.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

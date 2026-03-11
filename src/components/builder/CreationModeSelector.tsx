import React from "react";
import { Button } from "../ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import { Mic, MessageSquare, GitBranch, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils.ts";

export type CreationMode = "voice" | "chat" | "visual";

interface CreationModeSelectorProps {
  selectedMode: CreationMode | null;
  onSelectMode: (mode: CreationMode) => void;
  onClose?: () => void;
}

const modes = [
  {
    id: "voice" as CreationMode,
    title: "语音创建",
    description: "用语音描述你的需求，AI自动生成配置",
    icon: Mic,
    badge: "推荐",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    features: ["30秒快速创建", "自然语言理解", "语音持续调整"]
  },
  {
    id: "chat" as CreationMode,
    title: "对话创建",
    description: "一问一答，AI引导你完成配置",
    icon: MessageSquare,
    badge: null,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    features: ["步骤式引导", "智能推荐", "边聊边调"]
  },
  {
    id: "visual" as CreationMode,
    title: "可视化编排",
    description: "专业的拖拽式技能编排工具",
    icon: GitBranch,
    badge: "高级",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    features: ["完全自定义", "技能组合", "专业调试"]
  }
];

const CreationModeSelector: React.FC<CreationModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  onClose
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">选择创建方式</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          选择最适合你的方式来创建 Agent
        </p>
      </div>

      <div className="grid gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;

          return (
            <Card
              key={mode.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                isSelected 
                  ? "ring-2 ring-primary border-primary" 
                  : "hover:border-primary/50"
              )}
              onClick={() => onSelectMode(mode.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                    mode.bgColor
                  )}>
                    <Icon className={cn("h-6 w-6", mode.color)} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground">{mode.title}</h3>
                      {mode.badge && (
                        <Badge 
                          variant={mode.badge === "推荐" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {mode.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {mode.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {mode.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors",
                    isSelected 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground/30"
                  )}>
                    {isSelected && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedMode && (
        <div className="flex justify-center">
          <Button onClick={onClose} className="px-8">
            开始创建
          </Button>
        </div>
      )}
    </div>
  );
};

export default CreationModeSelector;

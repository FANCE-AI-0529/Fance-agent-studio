import React from "react";
import { 
  Sparkles, 
  ArrowRight,
  MessageSquare,
  Settings,
  Lightbulb,
  Blocks,
  BookOpen,
  Rocket,
  Layers,
  Wand2,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Agent } from "@/hooks/useAgents";
import { cn } from "@/lib/utils";
import { AgentAvatarDisplay, AgentAvatar } from "@/components/builder/AgentAvatarPicker";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  command: string;
  category: "guide" | "explore" | "learn";
  description: string;
}

const quickActions: QuickAction[] = [
  {
    icon: <Rocket className="h-4 w-4" />,
    label: "创建第一个智能体",
    command: "如何创建我的第一个智能体？",
    category: "guide",
    description: "分步指导构建流程",
  },
  {
    icon: <Blocks className="h-4 w-4" />,
    label: "探索技能商店",
    command: "有哪些可用的技能？",
    category: "explore",
    description: "展示平台技能能力",
  },
  {
    icon: <BookOpen className="h-4 w-4" />,
    label: "智能体模板",
    command: "推荐一些适合新手的智能体模板",
    category: "guide",
    description: "快速上手模板推荐",
  },
  {
    icon: <Layers className="h-4 w-4" />,
    label: "能力包介绍",
    command: "什么是能力包？如何使用？",
    category: "learn",
    description: "能力包功能说明",
  },
  {
    icon: <Wand2 className="h-4 w-4" />,
    label: "系统提示词技巧",
    command: "如何编写好的系统提示词？",
    category: "learn",
    description: "提示词最佳实践",
  },
  {
    icon: <HelpCircle className="h-4 w-4" />,
    label: "常见问题",
    command: "Fance OS 平台有哪些常见问题？",
    category: "learn",
    description: "平台使用FAQ",
  },
];

const categoryColors = {
  guide: "bg-primary/10 text-primary border-primary/20",
  explore: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  learn: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const categoryLabels = {
  guide: "引导",
  explore: "探索",
  learn: "学习",
};

interface WelcomeGuideProps {
  agent: Agent | null;
  onCommandClick: (command: string) => void;
}

// Helper to get avatar from agent manifest
function getAgentAvatar(agent: Agent | null): AgentAvatar {
  if (!agent) return { iconId: "sparkles", colorId: "primary" };
  const manifest = agent.manifest as any;
  if (manifest?.avatar) {
    return manifest.avatar as AgentAvatar;
  }
  return { iconId: "sparkles", colorId: "primary" };
}

const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ agent, onCommandClick }) => {
  const agentName = agent?.name || "Fance 智能助手";
  const agentDepartment = agent?.department || "平台向导";
  const avatar = getAgentAvatar(agent);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-2xl w-full space-y-6">
        {/* Agent Introduction */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center">
            <AgentAvatarDisplay avatar={avatar} size="lg" className="w-16 h-16" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{agentName}</h1>
            <p className="text-muted-foreground mt-1">{agentDepartment}</p>
          </div>
        </div>

        {/* What is Fance OS */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              欢迎来到 Fance OS
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              我是您的<span className="font-medium text-foreground">专属平台向导</span>，
              可以帮助您了解如何构建智能体、探索各种技能和能力包。
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                自然对话
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                智能引导
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Blocks className="h-3 w-3" />
                技能探索
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Settings className="h-3 w-3" />
                构建指导
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Building Guide */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">我可以帮您...</CardTitle>
            <CardDescription>
              点击下方任意选项开始，或直接输入您的问题
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => onCommandClick(action.command)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                    "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                    "bg-card hover:bg-accent/50"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    categoryColors[action.category]
                  )}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{action.label}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          categoryColors[action.category]
                        )}
                      >
                        {categoryLabels[action.category]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Start Prompt */}
        <div className="text-center text-sm text-muted-foreground">
          <p>有任何关于 Fance OS 的问题，都可以问我！</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeGuide;

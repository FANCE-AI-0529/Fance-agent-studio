import React from "react";
import { 
  Bot, 
  Sparkles, 
  FileText, 
  Database, 
  Globe, 
  Shield, 
  Zap,
  ArrowRight,
  MessageSquare,
  Settings,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Agent } from "@/hooks/useAgents";
import { cn } from "@/lib/utils";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  command: string;
  category: "read" | "network" | "write" | "admin";
  description: string;
}

const quickActions: QuickAction[] = [
  {
    icon: <FileText className="h-4 w-4" />,
    label: "读取配置文件",
    command: "帮我读取系统配置文件",
    category: "read",
    description: "安全读取本地文件内容",
  },
  {
    icon: <Database className="h-4 w-4" />,
    label: "查询数据",
    command: "查询今日的处理数据统计",
    category: "read",
    description: "从数据库检索信息",
  },
  {
    icon: <Globe className="h-4 w-4" />,
    label: "调用API",
    command: "调用外部API获取最新数据",
    category: "network",
    description: "发起网络请求（需确认）",
  },
  {
    icon: <FileText className="h-4 w-4" />,
    label: "生成申请表",
    command: "帮我生成一份餐饮经营许可证申请表",
    category: "write",
    description: "创建表单文档（需确认）",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    label: "执行脚本",
    command: "执行自动化部署脚本",
    category: "admin",
    description: "运行系统脚本（高风险）",
  },
  {
    icon: <Shield className="h-4 w-4" />,
    label: "删除数据",
    command: "删除过期的临时数据",
    category: "admin",
    description: "删除操作（高风险）",
  },
];

const categoryColors = {
  read: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  network: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  write: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  admin: "bg-red-500/10 text-red-600 border-red-500/20",
};

const categoryLabels = {
  read: "低风险",
  network: "中风险",
  write: "中风险",
  admin: "高风险",
};

interface WelcomeGuideProps {
  agent: Agent | null;
  onCommandClick: (command: string) => void;
}

const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ agent, onCommandClick }) => {
  const agentName = agent?.name || "MPLP 智能助手";
  const agentDepartment = agent?.department || "Agent OS 平台";

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-2xl w-full space-y-6">
        {/* Agent Introduction */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{agentName}</h1>
            <p className="text-muted-foreground mt-1">{agentDepartment}</p>
          </div>
        </div>

        {/* What is an Agent */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              什么是智能体 (Agent)?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <span className="font-medium text-foreground">智能体</span> 是一个可以理解自然语言、执行任务的 AI 助手。
              它具备多种技能，可以帮助您完成各种工作。
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                自然对话
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                智能理解
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                安全确认
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Settings className="h-3 w-3" />
                可配置技能
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* How to Use */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">如何使用智能体?</CardTitle>
            <CardDescription>
              直接用自然语言告诉我您需要什么，我会自动选择合适的技能来完成
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

        {/* Security Notice */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
          <Shield className="h-5 w-5 text-governance flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">安全提示</p>
            <p className="text-muted-foreground mt-1">
              涉及敏感操作（如网络请求、文件写入、数据删除）时，智能体会先向您确认，
              您可以查看详情后决定是否执行。
            </p>
          </div>
        </div>

        {/* Start Prompt */}
        <div className="text-center text-sm text-muted-foreground">
          <p>点击上方示例或在下方输入框中输入您的需求开始对话</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeGuide;

import { Link } from "react-router-dom";
import { 
  Bot, 
  Hammer, 
  Play, 
  ArrowRight, 
  Brain, 
  Shield, 
  Activity,
  Zap,
  Users,
  FileCode,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "活跃 Agent", value: "12", icon: Bot, trend: "+3" },
  { label: "技能库", value: "48", icon: FileCode, trend: "+8" },
  { label: "今日任务", value: "156", icon: Activity, trend: "+24" },
  { label: "用户数", value: "89", icon: Users, trend: "+12" },
];

const quickActions = [
  {
    title: "创建新 Agent",
    description: "通过拖拽组装技能，快速构建智能体",
    icon: Bot,
    href: "/builder",
    color: "cognitive"
  },
  {
    title: "开发新技能",
    description: "编写 SKILL.md 定义能力模块",
    icon: Hammer,
    href: "/foundry",
    color: "governance"
  },
  {
    title: "进入运行环境",
    description: "与已部署的 Agent 进行对话",
    icon: Play,
    href: "/runtime",
    color: "primary"
  }
];

const Index = () => {
  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Agent OS Studio</h1>
            <p className="text-muted-foreground">
              企业级智能体操作系统构建平台
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border">
              <div className="w-2 h-2 rounded-full bg-status-executing animate-pulse" />
              <span className="text-xs">系统运行中</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Dual Engine Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="panel p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-cognitive/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-cognitive" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">认知引擎</h3>
                <p className="text-xs text-muted-foreground">Anthropic Skills Filesystem</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">已加载技能</span>
              <Badge variant="secondary">48 个</Badge>
            </div>
          </div>

          <div className="panel p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-governance/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-governance" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">治理引擎</h3>
                <p className="text-xs text-muted-foreground">MPLP Protocol v1.0</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">协议状态</span>
              <Badge className="bg-status-executing/10 text-status-executing border-0">运行中</Badge>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="panel p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-status-executing flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" />
                  {stat.trend}
                </span>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">快速开始</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link 
                key={action.title} 
                to={action.href}
                className="panel p-5 rounded-lg hover:border-primary/50 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${
                  action.color === "cognitive" 
                    ? "bg-cognitive/10" 
                    : action.color === "governance"
                    ? "bg-governance/10"
                    : "bg-primary/10"
                }`}>
                  <action.icon className={`h-6 w-6 ${
                    action.color === "cognitive" 
                      ? "text-cognitive" 
                      : action.color === "governance"
                      ? "text-governance"
                      : "text-primary"
                  }`} />
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {action.description}
                </p>
                <div className="flex items-center gap-1 text-sm text-primary">
                  <span>开始</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold mb-4">最近活动</h2>
          <div className="panel rounded-lg divide-y divide-border">
            {[
              { agent: "餐饮办证助手", action: "完成 32 次对话", time: "5 分钟前", status: "active" },
              { agent: "数据分析专员", action: "生成月度报表", time: "1 小时前", status: "completed" },
              { agent: "代码审查助手", action: "审查 PR #156", time: "2 小时前", status: "completed" },
            ].map((activity, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{activity.agent}</div>
                    <div className="text-xs text-muted-foreground">{activity.action}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === "active" ? "bg-status-executing animate-pulse" : "bg-muted"
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
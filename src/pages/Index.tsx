import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Bot, 
  Hammer, 
  Play, 
  ArrowRight, 
  Brain, 
  Shield, 
  FileCode,
  Loader2,
  CheckCircle2,
  Clock,
  Upload,
  Sparkles,
  Target,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyAgents, useDeployedAgents } from "@/hooks/useAgents";
import { useMySkills, usePublishedSkills } from "@/hooks/useSkills";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState, PulseIndicator } from "@/components/ui/empty-state";
import { OnboardingCard } from "@/components/ui/onboarding-card";
import { UsageStatsPanel } from "@/components/dashboard/UsageStatsPanel";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: myAgents = [], isLoading: agentsLoading } = useMyAgents();
  const { data: deployedAgents = [] } = useDeployedAgents();
  const { data: mySkills = [], isLoading: skillsLoading } = useMySkills();
  const { data: publishedSkills = [] } = usePublishedSkills();

  const isLoading = agentsLoading || skillsLoading;

  // Calculate stats
  const totalAgents = myAgents.length;
  const deployedCount = myAgents.filter(a => a.status === 'deployed').length;
  const draftAgents = myAgents.filter(a => a.status === 'draft').length;
  
  const totalSkills = mySkills.length;
  const publishedSkillsCount = mySkills.filter(s => s.is_published).length;
  const draftSkills = mySkills.filter(s => !s.is_published).length;

  const stats = [
    { 
      label: "我的 Agent", 
      value: totalAgents.toString(), 
      icon: Bot, 
      subLabel: `${deployedCount} 已部署`,
      color: "cognitive"
    },
    { 
      label: "已部署 Agent", 
      value: deployedAgents.length.toString(), 
      icon: CheckCircle2, 
      subLabel: "全平台",
      color: "status-executing"
    },
    { 
      label: "我的技能", 
      value: totalSkills.toString(), 
      icon: FileCode, 
      subLabel: `${publishedSkillsCount} 已发布`,
      color: "governance"
    },
    { 
      label: "技能市场", 
      value: publishedSkills.length.toString(), 
      icon: Upload, 
      subLabel: "公开可用",
      color: "primary"
    },
  ];

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
              <PulseIndicator color="success" size="sm" />
              <span className="text-xs font-mono">系统运行中</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Onboarding Card for new users */}
        {!user && (
          <OnboardingCard
            id="welcome-guest"
            title="欢迎来到 Agent OS Studio"
            description="企业级智能体构建平台，三步快速上手"
            steps={[
              {
                title: "第一步：创建您的智能体",
                description: "在构建器中通过拖拽技能卡片，快速组装您的专属 AI 助手",
                icon: <Bot className="h-4 w-4 text-primary" />,
                action: {
                  label: "开始创建",
                  href: "/builder",
                },
              },
              {
                title: "第二步：开发或选择技能",
                description: "从技能市场选择现成技能，或在铸造厂开发自定义技能",
                icon: <Hammer className="h-4 w-4 text-primary" />,
                action: {
                  label: "浏览技能市场",
                  href: "/foundry",
                },
              },
              {
                title: "第三步：部署并对话",
                description: "一键部署智能体，在运行时环境中与它进行实时对话",
                icon: <Play className="h-4 w-4 text-primary" />,
                action: {
                  label: "进入运行环境",
                  href: "/runtime",
                },
              },
            ]}
          />
        )}

        {user && myAgents.length === 0 && mySkills.length === 0 && (
          <OnboardingCard
            id="welcome-new-user"
            title="开始您的第一个项目"
            description="让我们一起创建您的第一个智能体"
            steps={[
              {
                title: "快速创建智能体",
                description: "使用向导模式，只需回答几个问题即可自动生成智能体配置",
                icon: <Sparkles className="h-4 w-4 text-primary" />,
                action: {
                  label: "启动创建向导",
                  onClick: () => navigate("/builder"),
                },
              },
              {
                title: "选择预设模板",
                description: "从客服助手、数据分析师、文档处理等模板快速开始",
                icon: <Target className="h-4 w-4 text-primary" />,
                action: {
                  label: "浏览模板库",
                  onClick: () => navigate("/builder"),
                },
              },
              {
                title: "从技能开始",
                description: "先开发一个简单的技能，然后再组装成完整的智能体",
                icon: <Zap className="h-4 w-4 text-primary" />,
                action: {
                  label: "创建技能",
                  onClick: () => navigate("/foundry"),
                },
              },
            ]}
          />
        )}
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
              <Badge variant="secondary">
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : `${publishedSkills.length} 个`}
              </Badge>
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

        {/* Stats Dashboard */}
        <div>
          <h2 className="text-lg font-semibold mb-4">系统概览</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label} 
                className="panel p-4 rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`h-4 w-4 text-${stat.color}`} />
                  {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <div className="text-2xl font-bold font-mono">
                  {isLoading ? "-" : stat.value}
                </div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="text-xs text-muted-foreground/70 mt-1">{stat.subLabel}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* My Resources Summary */}
        {user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agents Summary */}
            <div className="panel p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">我的 Agent</h3>
                <Link to="/builder">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    查看全部
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : myAgents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  暂无 Agent，点击"创建新 Agent"开始
                </div>
              ) : (
                <div className="space-y-2">
                  {myAgents.slice(0, 3).map((agent) => (
                    <Link 
                      key={agent.id} 
                      to={`/builder/${agent.id}`}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-cognitive/10 flex items-center justify-center">
                          <Bot className="h-3.5 w-3.5 text-cognitive" />
                        </div>
                        <span className="text-sm font-medium">{agent.name}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          agent.status === 'deployed' 
                            ? 'border-status-executing/50 text-status-executing' 
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {agent.status === 'deployed' ? '已部署' : '草稿'}
                      </Badge>
                    </Link>
                  ))}
                  {myAgents.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center pt-2">
                      还有 {myAgents.length - 3} 个 Agent...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Skills Summary */}
            <div className="panel p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">我的技能</h3>
                <Link to="/foundry">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    查看全部
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : mySkills.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  暂无技能，点击"开发新技能"开始
                </div>
              ) : (
                <div className="space-y-2">
                  {mySkills.slice(0, 3).map((skill) => (
                    <div 
                      key={skill.id} 
                      className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-governance/10 flex items-center justify-center">
                          <FileCode className="h-3.5 w-3.5 text-governance" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{skill.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">v{skill.version}</span>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          skill.is_published 
                            ? 'border-status-executing/50 text-status-executing' 
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {skill.is_published ? '已发布' : '草稿'}
                      </Badge>
                    </div>
                  ))}
                  {mySkills.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center pt-2">
                      还有 {mySkills.length - 3} 个技能...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* Usage Stats Panel */}
        <UsageStatsPanel />

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold mb-4">最近活动</h2>
          <div className="panel rounded-lg divide-y divide-border">
            {myAgents.length === 0 && mySkills.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                暂无活动记录，开始创建您的第一个 Agent 或技能吧
              </div>
            ) : (
              [...myAgents, ...mySkills]
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .slice(0, 5)
                .map((item, i) => {
                  const isAgent = 'status' in item;
                  const timeAgo = getTimeAgo(new Date(item.updated_at));
                  return (
                    <div key={i} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isAgent ? 'bg-cognitive/10' : 'bg-governance/10'
                        }`}>
                          {isAgent ? (
                            <Bot className="h-4 w-4 text-cognitive" />
                          ) : (
                            <FileCode className="h-4 w-4 text-governance" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {isAgent ? 'Agent' : '技能'} · {isAgent 
                              ? (item as any).status === 'deployed' ? '已部署' : '草稿'
                              : (item as any).is_published ? '已发布' : '草稿'
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN');
}

export default Index;
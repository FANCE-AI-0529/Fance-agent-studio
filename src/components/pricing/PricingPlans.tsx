import { useState } from "react";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { Switch } from "../ui/switch.tsx";
import { Check, Sparkles, Zap, Users, Crown } from "lucide-react";
import { cn } from "../../lib/utils.ts";
import { toast } from "../../hooks/use-toast.ts";

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  icon: React.ElementType;
  popular?: boolean;
  features: string[];
  limits: {
    conversations: string;
    agents: string;
    skills: string;
  };
}

const plans: PricingPlan[] = [
  {
    id: "free",
    name: "免费版",
    description: "适合个人体验",
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: Sparkles,
    features: [
      "每天20次对话",
      "1个AI助手",
      "5个基础能力",
      "社区模板",
      "基础数据分析",
    ],
    limits: {
      conversations: "20次/天",
      agents: "1个",
      skills: "5个",
    },
  },
  {
    id: "pro",
    name: "专业版",
    description: "适合个人深度使用",
    monthlyPrice: 29,
    yearlyPrice: 290,
    icon: Zap,
    popular: true,
    features: [
      "无限对话",
      "5个AI助手",
      "全部能力",
      "高级模板",
      "优先客服",
      "API访问",
      "数据导出",
    ],
    limits: {
      conversations: "无限",
      agents: "5个",
      skills: "无限",
    },
  },
  {
    id: "team",
    name: "团队版",
    description: "适合团队协作",
    monthlyPrice: 99,
    yearlyPrice: 990,
    icon: Users,
    features: [
      "包含专业版全部功能",
      "无限AI助手",
      "团队协作",
      "权限管理",
      "审计日志",
      "专属客服",
      "自定义域名",
      "SLA保障",
    ],
    limits: {
      conversations: "无限",
      agents: "无限",
      skills: "无限",
    },
  },
];

interface PricingPlansProps {
  currentPlan?: string;
  onSelectPlan?: (planId: string, isYearly: boolean) => void;
}

export function PricingPlans({ currentPlan = "free", onSelectPlan }: PricingPlansProps) {
  const [isYearly, setIsYearly] = useState(false);

  const handleSelectPlan = (planId: string) => {
    if (planId === currentPlan) {
      toast({
        title: "当前计划",
        description: "您已经订阅了此计划",
      });
      return;
    }

    if (onSelectPlan) {
      onSelectPlan(planId, isYearly);
    } else {
      toast({
        title: "升级计划",
        description: `正在跳转到${plans.find(p => p.id === planId)?.name}支付页面...`,
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* 计费周期切换 */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn("text-sm", !isYearly && "text-foreground font-medium")}>
          月付
        </span>
        <Switch checked={isYearly} onCheckedChange={setIsYearly} />
        <span className={cn("text-sm", isYearly && "text-foreground font-medium")}>
          年付
        </span>
        {isYearly && (
          <Badge variant="secondary" className="ml-2">
            省2个月
          </Badge>
        )}
      </div>

      {/* 计划卡片 */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const isCurrent = plan.id === currentPlan;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative bg-card border rounded-2xl p-6 flex flex-col",
                plan.popular && "border-primary shadow-lg",
                isCurrent && "ring-2 ring-primary"
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Crown className="h-3 w-3 mr-1" />
                  最受欢迎
                </Badge>
              )}

              <div className="space-y-4">
                {/* 图标和名称 */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    plan.popular ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>

                {/* 价格 */}
                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      ¥{price}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      /{isYearly ? "年" : "月"}
                    </span>
                  </div>
                </div>

                {/* 限额 */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-border">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">对话</p>
                    <p className="text-sm font-medium">{plan.limits.conversations}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">助手</p>
                    <p className="text-sm font-medium">{plan.limits.agents}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">能力</p>
                    <p className="text-sm font-medium">{plan.limits.skills}</p>
                  </div>
                </div>

                {/* 功能列表 */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* 按钮 */}
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent}
                >
                  {isCurrent ? "当前计划" : plan.id === "free" ? "开始使用" : "立即升级"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 企业版入口 */}
      <div className="bg-muted/50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">需要更多？</h3>
          <p className="text-sm text-muted-foreground">
            企业版提供无限容量、私有化部署、定制开发等服务
          </p>
        </div>
        <Button variant="outline">联系销售</Button>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PenTool,
  BarChart3,
  MessageSquare,
  GraduationCap,
  Calendar,
  ShoppingBag,
  Code,
  FileText,
  ArrowRight,
} from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: typeof PenTool;
  color: string;
  bgColor: string;
  href: string;
  popular?: boolean;
}

const scenarios: Scenario[] = [
  {
    id: "writing",
    title: "写作助手",
    description: "帮你写文案、邮件、报告",
    icon: PenTool,
    color: "text-primary",
    bgColor: "bg-primary/10",
    href: "/builder?template=writing",
    popular: true,
  },
  {
    id: "analysis",
    title: "数据分析",
    description: "分析数据、生成报表图表",
    icon: BarChart3,
    color: "text-cognitive",
    bgColor: "bg-cognitive/10",
    href: "/builder?template=analysis",
  },
  {
    id: "customer-service",
    title: "客服助手",
    description: "自动回复客户问题",
    icon: MessageSquare,
    color: "text-governance",
    bgColor: "bg-governance/10",
    href: "/builder?template=customer-service",
  },
  {
    id: "learning",
    title: "学习伙伴",
    description: "辅导学习、解答问题",
    icon: GraduationCap,
    color: "text-status-executing",
    bgColor: "bg-status-executing/10",
    href: "/builder?template=learning",
  },
  {
    id: "scheduling",
    title: "日程管理",
    description: "安排会议、提醒待办",
    icon: Calendar,
    color: "text-status-planning",
    bgColor: "bg-status-planning/10",
    href: "/builder?template=scheduling",
  },
  {
    id: "shopping",
    title: "购物顾问",
    description: "比价推荐、购买建议",
    icon: ShoppingBag,
    color: "text-status-confirm",
    bgColor: "bg-status-confirm/10",
    href: "/builder?template=shopping",
  },
  {
    id: "coding",
    title: "编程助手",
    description: "代码补全、Debug帮手",
    icon: Code,
    color: "text-cognitive",
    bgColor: "bg-cognitive/10",
    href: "/builder?template=coding",
  },
  {
    id: "document",
    title: "文档处理",
    description: "总结文档、提取信息",
    icon: FileText,
    color: "text-governance",
    bgColor: "bg-governance/10",
    href: "/builder?template=document",
  },
];

export function ScenarioCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {scenarios.map((scenario, index) => (
        <motion.div
          key={scenario.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link
            to={scenario.href}
            className="group relative flex flex-col items-center p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300"
          >
            {scenario.popular && (
              <div className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-full">
                热门
              </div>
            )}
            <div className={`w-12 h-12 rounded-xl ${scenario.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <scenario.icon className={`h-6 w-6 ${scenario.color}`} />
            </div>
            <h3 className="font-medium text-sm text-center group-hover:text-primary transition-colors">
              {scenario.title}
            </h3>
            <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
              {scenario.description}
            </p>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

// Hot templates section
interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  usageCount: number;
  rating: number;
}

const hotTemplates: Template[] = [
  {
    id: "1",
    name: "智能客服小助手",
    description: "7x24小时自动回复客户咨询，支持多轮对话",
    category: "客服",
    usageCount: 1234,
    rating: 4.8,
  },
  {
    id: "2", 
    name: "周报生成器",
    description: "一键汇总本周工作内容，生成专业周报",
    category: "办公",
    usageCount: 856,
    rating: 4.6,
  },
  {
    id: "3",
    name: "小红书文案大师",
    description: "生成爆款小红书笔记，提升互动量",
    category: "营销",
    usageCount: 2156,
    rating: 4.9,
  },
  {
    id: "4",
    name: "英语口语陪练",
    description: "纠正发音、模拟对话场景，提升口语",
    category: "学习",
    usageCount: 678,
    rating: 4.7,
  },
];

export function HotTemplates() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {hotTemplates.map((template, index) => (
        <motion.div
          key={template.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Link
            to={`/builder?template=${template.id}`}
            className="group flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                  {template.name}
                </h4>
                <span className="px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded">
                  {template.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {template.description}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{template.usageCount.toLocaleString()} 人使用</span>
                <span className="flex items-center gap-1">
                  ⭐ {template.rating}
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

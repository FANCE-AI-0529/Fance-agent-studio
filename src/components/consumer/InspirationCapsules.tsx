import { motion } from "framer-motion";
import { 
  FileText, 
  TrendingUp, 
  MessageSquare, 
  Code, 
  Search,
  Calendar,
  Mail,
  BarChart3
} from "lucide-react";

interface Inspiration {
  id: string;
  label: string;
  prompt: string;
  icon: React.ReactNode;
  color: string;
}

const inspirations: Inspiration[] = [
  {
    id: "report",
    label: "写周报",
    prompt: "帮我创建一个能汇总工作日志并自动撰写周报的效率助手",
    icon: <FileText className="h-3.5 w-3.5" />,
    color: "from-blue-500/20 to-blue-600/20",
  },
  {
    id: "finance",
    label: "分析财报",
    prompt: "帮我创建一个能分析财务报表并生成洞察报告的财务助手",
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    color: "from-emerald-500/20 to-emerald-600/20",
  },
  {
    id: "competitor",
    label: "监控竞品",
    prompt: "帮我创建一个能追踪竞争对手动态并发送提醒的市场助手",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    color: "from-orange-500/20 to-orange-600/20",
  },
  {
    id: "customer",
    label: "智能客服",
    prompt: "帮我创建一个能处理客户咨询和投诉的智能客服助手",
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    color: "from-purple-500/20 to-purple-600/20",
  },
  {
    id: "code",
    label: "代码审查",
    prompt: "帮我创建一个能审查代码质量并提供改进建议的开发助手",
    icon: <Code className="h-3.5 w-3.5" />,
    color: "from-pink-500/20 to-pink-600/20",
  },
  {
    id: "research",
    label: "信息调研",
    prompt: "帮我创建一个能搜索整理信息并生成报告的调研助手",
    icon: <Search className="h-3.5 w-3.5" />,
    color: "from-cyan-500/20 to-cyan-600/20",
  },
  {
    id: "schedule",
    label: "日程管理",
    prompt: "帮我创建一个能智能安排日程和提醒会议的日程助手",
    icon: <Calendar className="h-3.5 w-3.5" />,
    color: "from-amber-500/20 to-amber-600/20",
  },
  {
    id: "email",
    label: "邮件处理",
    prompt: "帮我创建一个能分类处理邮件并起草回复的邮件助手",
    icon: <Mail className="h-3.5 w-3.5" />,
    color: "from-indigo-500/20 to-indigo-600/20",
  },
];

interface InspirationCapsulesProps {
  onSelect: (prompt: string) => void;
}

export function InspirationCapsules({ onSelect }: InspirationCapsulesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="w-full max-w-3xl mx-auto mt-6 px-4"
    >
      <div className="flex flex-wrap justify-center gap-2">
        {inspirations.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + index * 0.05 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(item.prompt)}
            className={`
              group relative flex items-center gap-2 
              px-4 py-2 rounded-full
              bg-gradient-to-r ${item.color}
              border border-border/30 hover:border-border/50
              backdrop-blur-sm
              transition-all duration-200
            `}
          >
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">
              {item.icon}
            </span>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              {item.label}
            </span>
            
            {/* Hover glow */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-md bg-primary/10" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

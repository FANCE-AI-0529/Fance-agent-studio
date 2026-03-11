import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  Sparkles,
  Zap,
  Send,
  MessageSquare,
  HelpCircle,
  Code2,
  FileSearch,
  BarChart3,
  Mail,
  CalendarDays,
  ListTodo,
  Image,
  Link2,
} from "lucide-react";
import { cn } from "../../lib/utils.ts";

interface QuickCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  category: "common" | "analysis" | "action" | "help";
}

const quickCommands: QuickCommand[] = [
  // Common
  {
    id: "summarize",
    label: "总结内容",
    description: "帮我总结一段文字或文档",
    icon: <FileText className="h-4 w-4" />,
    prompt: "请帮我总结以下内容：",
    category: "common",
  },
  {
    id: "search",
    label: "搜索信息",
    description: "在知识库或网络中搜索",
    icon: <Search className="h-4 w-4" />,
    prompt: "请帮我搜索关于",
    category: "common",
  },
  {
    id: "generate",
    label: "生成内容",
    description: "生成文案、邮件、报告等",
    icon: <Sparkles className="h-4 w-4" />,
    prompt: "请帮我生成一份",
    category: "common",
  },
  {
    id: "translate",
    label: "翻译文本",
    description: "多语言互译",
    icon: <MessageSquare className="h-4 w-4" />,
    prompt: "请将以下内容翻译成",
    category: "common",
  },
  // Analysis
  {
    id: "analyze",
    label: "分析数据",
    description: "分析数据并生成报告",
    icon: <BarChart3 className="h-4 w-4" />,
    prompt: "请分析以下数据：",
    category: "analysis",
  },
  {
    id: "review",
    label: "审阅文档",
    description: "检查并改进文档质量",
    icon: <FileSearch className="h-4 w-4" />,
    prompt: "请审阅以下文档并提出改进建议：",
    category: "analysis",
  },
  {
    id: "code",
    label: "代码解读",
    description: "解释或生成代码",
    icon: <Code2 className="h-4 w-4" />,
    prompt: "请解释以下代码的功能：",
    category: "analysis",
  },
  // Action
  {
    id: "email",
    label: "撰写邮件",
    description: "起草专业邮件",
    icon: <Mail className="h-4 w-4" />,
    prompt: "请帮我写一封邮件，主题是：",
    category: "action",
  },
  {
    id: "schedule",
    label: "安排日程",
    description: "规划日程或会议",
    icon: <CalendarDays className="h-4 w-4" />,
    prompt: "请帮我安排一个日程：",
    category: "action",
  },
  {
    id: "todo",
    label: "创建任务",
    description: "创建待办事项",
    icon: <ListTodo className="h-4 w-4" />,
    prompt: "请帮我创建以下任务：",
    category: "action",
  },
  // Help
  {
    id: "help",
    label: "使用帮助",
    description: "了解可用功能",
    icon: <HelpCircle className="h-4 w-4" />,
    prompt: "请告诉我你有哪些功能？",
    category: "help",
  },
];

interface QuickCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (prompt: string) => void;
  filter?: string;
}

export function QuickCommandMenu({
  isOpen,
  onClose,
  onSelect,
  filter = "",
}: QuickCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = quickCommands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(filter.toLowerCase()) ||
      cmd.description.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
        e.preventDefault();
        onSelect(filteredCommands[selectedIndex].prompt);
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onSelect, onClose]);

  if (!isOpen || filteredCommands.length === 0) return null;

  const groupedCommands = {
    common: filteredCommands.filter((c) => c.category === "common"),
    analysis: filteredCommands.filter((c) => c.category === "analysis"),
    action: filteredCommands.filter((c) => c.category === "action"),
    help: filteredCommands.filter((c) => c.category === "help"),
  };

  const categoryLabels = {
    common: "常用",
    analysis: "分析",
    action: "操作",
    help: "帮助",
  };

  let globalIndex = -1;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
      >
        <div className="p-2 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5" />
            <span>输入 "/" 打开快捷命令菜单</span>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto p-1">
          {(Object.keys(groupedCommands) as Array<keyof typeof groupedCommands>).map(
            (category) => {
              const commands = groupedCommands[category];
              if (commands.length === 0) return null;

              return (
                <div key={category} className="mb-2 last:mb-0">
                  <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {categoryLabels[category]}
                  </div>
                  {commands.map((command) => {
                    globalIndex++;
                    const isSelected = globalIndex === selectedIndex;
                    return (
                      <button
                        key={command.id}
                        className={cn(
                          "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        )}
                        onClick={() => {
                          onSelect(command.prompt);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            isSelected ? "bg-primary/20" : "bg-muted"
                          )}
                        >
                          {command.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{command.label}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {command.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            }
          )}
        </div>

        <div className="p-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">↑↓</kbd>
            <span>导航</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">Enter</kbd>
            <span>选择</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">Esc</kbd>
            <span>关闭</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Message templates for quick starts
interface MessageTemplate {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: string;
}

const messageTemplates: MessageTemplate[] = [
  {
    id: "help",
    label: "了解功能",
    icon: <HelpCircle className="h-4 w-4" />,
    content: "你好，请介绍一下你的功能和可以帮我做什么？",
  },
  {
    id: "summarize",
    label: "总结文档",
    icon: <FileText className="h-4 w-4" />,
    content: "请帮我总结以下文档的要点...",
  },
  {
    id: "analyze",
    label: "分析数据",
    icon: <BarChart3 className="h-4 w-4" />,
    content: "请分析以下数据并给出见解...",
  },
  {
    id: "draft",
    label: "起草邮件",
    icon: <Mail className="h-4 w-4" />,
    content: "请帮我写一封关于...的邮件",
  },
];

interface MessageTemplatesProps {
  onSelect: (content: string) => void;
  className?: string;
}

export function MessageTemplates({ onSelect, className }: MessageTemplatesProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {messageTemplates.map((template) => (
        <motion.button
          key={template.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(template.content)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {template.icon}
          {template.label}
        </motion.button>
      ))}
    </div>
  );
}

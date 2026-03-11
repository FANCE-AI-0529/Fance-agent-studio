import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Keyboard,
  Command,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CornerDownLeft,
  X,
  Search,
  Settings,
  Moon,
  MessageSquare,
  Plus,
  Save,
  Copy,
  Trash2,
  Undo,
  Redo,
  Home,
  Play,
  Pause,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import { cn } from "../../lib/utils.ts";

interface ShortcutItem {
  keys: string[];
  description: string;
  icon?: React.ReactNode;
}

interface ShortcutCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcuts: ShortcutItem[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    id: "global",
    label: "全局",
    icon: <Command className="h-4 w-4" />,
    shortcuts: [
      { keys: ["⌘", "K"], description: "打开命令面板", icon: <Search className="h-3.5 w-3.5" /> },
      { keys: ["⌘", "/"], description: "显示快捷键帮助", icon: <Keyboard className="h-3.5 w-3.5" /> },
      { keys: ["⌘", "D"], description: "切换深色模式", icon: <Moon className="h-3.5 w-3.5" /> },
      { keys: ["⌘", ","], description: "打开设置", icon: <Settings className="h-3.5 w-3.5" /> },
      { keys: ["⌘", "H"], description: "返回首页", icon: <Home className="h-3.5 w-3.5" /> },
      { keys: ["Esc"], description: "关闭对话框/面板" },
    ],
  },
  {
    id: "builder",
    label: "构建器",
    icon: <Plus className="h-4 w-4" />,
    shortcuts: [
      { keys: ["⌘", "S"], description: "保存工作流", icon: <Save className="h-3.5 w-3.5" /> },
      { keys: ["⌘", "Z"], description: "撤销", icon: <Undo className="h-3.5 w-3.5" /> },
      { keys: ["⌘", "⇧", "Z"], description: "重做", icon: <Redo className="h-3.5 w-3.5" /> },
      { keys: ["⌘", "C"], description: "复制选中节点", icon: <Copy className="h-3.5 w-3.5" /> },
      { keys: ["⌘", "V"], description: "粘贴节点" },
      { keys: ["Delete"], description: "删除选中节点", icon: <Trash2 className="h-3.5 w-3.5" /> },
      { keys: ["⌘", "A"], description: "全选节点" },
      { keys: ["⌘", "D"], description: "复制选中节点" },
      { keys: ["Space"], description: "拖拽画布" },
      { keys: ["⌘", "+"], description: "放大画布" },
      { keys: ["⌘", "-"], description: "缩小画布" },
      { keys: ["⌘", "0"], description: "重置缩放" },
      { keys: ["⌘", "F"], description: "适应视图" },
    ],
  },
  {
    id: "runtime",
    label: "运行时",
    icon: <MessageSquare className="h-4 w-4" />,
    shortcuts: [
      { keys: ["Enter"], description: "发送消息" },
      { keys: ["⇧", "Enter"], description: "换行" },
      { keys: ["⌘", "⇧", "F"], description: "搜索消息", icon: <Search className="h-3.5 w-3.5" /> },
      { keys: ["⌘", "N"], description: "新建对话", icon: <Plus className="h-3.5 w-3.5" /> },
      { keys: ["⌘", "Enter"], description: "运行/停止智能体", icon: <Play className="h-3.5 w-3.5" /> },
      { keys: ["Alt", "↑"], description: "上一条搜索结果" },
      { keys: ["Alt", "↓"], description: "下一条搜索结果" },
      { keys: ["⌘", "L"], description: "清空对话" },
    ],
  },
  {
    id: "navigation",
    label: "导航",
    icon: <ArrowRight className="h-4 w-4" />,
    shortcuts: [
      { keys: ["⌘", "1"], description: "切换到首页" },
      { keys: ["⌘", "2"], description: "切换到构建器" },
      { keys: ["⌘", "3"], description: "切换到工坊" },
      { keys: ["⌘", "4"], description: "切换到知识库" },
      { keys: ["⌘", "["], description: "后退" },
      { keys: ["⌘", "]"], description: "前进" },
      { keys: ["Tab"], description: "下一个焦点元素" },
      { keys: ["⇧", "Tab"], description: "上一个焦点元素" },
    ],
  },
  {
    id: "editor",
    label: "编辑器",
    icon: <Eye className="h-4 w-4" />,
    shortcuts: [
      { keys: ["⌘", "F"], description: "查找" },
      { keys: ["⌘", "G"], description: "查找下一个" },
      { keys: ["⌘", "⇧", "G"], description: "查找上一个" },
      { keys: ["⌘", "H"], description: "替换" },
      { keys: ["⌘", "/"], description: "切换注释" },
      { keys: ["⌘", "⇧", "K"], description: "删除行" },
      { keys: ["Alt", "↑"], description: "上移行" },
      { keys: ["Alt", "↓"], description: "下移行" },
      { keys: ["⌘", "⇧", "D"], description: "复制行" },
    ],
  },
];

// Key symbol mapping for display
const keySymbols: Record<string, React.ReactNode> = {
  "⌘": <Command className="h-3 w-3" />,
  "⇧": <span className="text-[10px]">Shift</span>,
  "Alt": <span className="text-[10px]">Alt</span>,
  "Ctrl": <span className="text-[10px]">Ctrl</span>,
  "Enter": <CornerDownLeft className="h-3 w-3" />,
  "↑": <ArrowUp className="h-3 w-3" />,
  "↓": <ArrowDown className="h-3 w-3" />,
  "←": <ArrowLeft className="h-3 w-3" />,
  "→": <ArrowRight className="h-3 w-3" />,
  "Esc": <span className="text-[10px]">Esc</span>,
  "Space": <span className="text-[10px]">Space</span>,
  "Tab": <span className="text-[10px]">Tab</span>,
  "Delete": <span className="text-[10px]">Del</span>,
};

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-0.5">
      {keys.map((key, index) => (
        <span key={index} className="flex items-center">
          <kbd
            className={cn(
              "inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5",
              "rounded border border-border bg-muted/50 font-mono text-xs",
              "shadow-sm"
            )}
          >
            {keySymbols[key] || key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="mx-0.5 text-muted-foreground text-xs">+</span>
          )}
        </span>
      ))}
    </div>
  );
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const [activeTab, setActiveTab] = useState("global");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            键盘快捷键
          </DialogTitle>
          <DialogDescription>
            使用键盘快捷键提升您的工作效率
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            {shortcutCategories.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="gap-1.5 text-xs"
              >
                {cat.icon}
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {shortcutCategories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-4">
              <ScrollArea className="max-h-[50vh]">
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        "border border-border hover:bg-accent/50 transition-colors"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {shortcut.icon && (
                          <div className="p-1.5 rounded bg-primary/10 text-primary">
                            {shortcut.icon}
                          </div>
                        )}
                        <span className="text-sm">{shortcut.description}</span>
                      </div>
                      <KeyCombo keys={shortcut.keys} />
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-muted-foreground">
          <span>
            提示: 按 <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">⌘ + /</kbd> 随时打开此面板
          </span>
          <Badge variant="outline">
            macOS 用户使用 ⌘，Windows/Linux 用户使用 Ctrl
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage keyboard shortcuts help panel
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cmd/Ctrl + /
    if ((e.metaKey || e.ctrlKey) && e.key === "/") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}

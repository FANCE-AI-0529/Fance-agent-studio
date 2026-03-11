import { useState } from "react";
import {
  Zap,
  Plus,
  Edit3,
  Trash2,
  Command,
  ChevronRight,
  GripVertical,
  Sparkles,
  FileText,
  Search,
  Calendar,
  Mail,
  Bot,
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { cn } from "../../lib/utils.ts";
import { toast } from "../../hooks/use-toast.ts";

export interface QuickCommand {
  id: string;
  name: string;
  command: string;
  icon?: string;
  category?: string;
  isBuiltIn?: boolean;
  usageCount?: number;
}

// 内置快捷指令
const builtInCommands: QuickCommand[] = [
  {
    id: "summarize",
    name: "总结对话",
    command: "请总结我们刚才的对话要点",
    icon: "📝",
    category: "常用",
    isBuiltIn: true,
  },
  {
    id: "explain",
    name: "详细解释",
    command: "请更详细地解释一下",
    icon: "💡",
    category: "常用",
    isBuiltIn: true,
  },
  {
    id: "simplify",
    name: "简化说明",
    command: "请用更简单的方式解释",
    icon: "✨",
    category: "常用",
    isBuiltIn: true,
  },
  {
    id: "translate-en",
    name: "翻译成英文",
    command: "请将上面的内容翻译成英文",
    icon: "🌐",
    category: "翻译",
    isBuiltIn: true,
  },
  {
    id: "proofread",
    name: "检查语法",
    command: "请帮我检查上面文字的语法错误",
    icon: "✏️",
    category: "写作",
    isBuiltIn: true,
  },
  {
    id: "continue",
    name: "继续",
    command: "请继续",
    icon: "➡️",
    category: "常用",
    isBuiltIn: true,
  },
];

interface QuickCommandPaletteProps {
  commands?: QuickCommand[];
  onSelectCommand: (command: string) => void;
  onAddCommand?: (command: QuickCommand) => void;
  onDeleteCommand?: (commandId: string) => void;
  trigger?: React.ReactNode;
}

export function QuickCommandPalette({
  commands = [],
  onSelectCommand,
  onAddCommand,
  onDeleteCommand,
  trigger,
}: QuickCommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCommand, setNewCommand] = useState({ name: "", command: "" });

  const allCommands = [...builtInCommands, ...commands];
  
  const filteredCommands = allCommands.filter(cmd =>
    cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.command.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 按分类分组
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    const category = cmd.category || "自定义";
    if (!acc[category]) acc[category] = [];
    acc[category].push(cmd);
    return acc;
  }, {} as Record<string, QuickCommand[]>);

  const handleSelect = (command: string) => {
    onSelectCommand(command);
    setOpen(false);
    setSearchTerm("");
  };

  const handleAddCommand = () => {
    if (newCommand.name && newCommand.command) {
      onAddCommand?.({
        id: Date.now().toString(),
        name: newCommand.name,
        command: newCommand.command,
        icon: "⚡",
        category: "自定义",
      });
      setNewCommand({ name: "", command: "" });
      setShowAddDialog(false);
      toast({
        title: "快捷指令已添加",
        description: `「${newCommand.name}」已保存`,
      });
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Zap className="h-4 w-4" />
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">快捷指令</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-3 w-3" />
                添加
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="搜索指令..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          <ScrollArea className="max-h-[300px]">
            <div className="p-2 space-y-3">
              {Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category}>
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                    {category}
                  </div>
                  <div className="space-y-0.5">
                    {cmds.map((cmd) => (
                      <div
                        key={cmd.id}
                        className="group flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => handleSelect(cmd.command)}
                      >
                        <span className="text-base">{cmd.icon || "⚡"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{cmd.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {cmd.command}
                          </p>
                        </div>
                        {!cmd.isBuiltIn && onDeleteCommand && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCommand(cmd.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filteredCommands.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Command className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">没有找到指令</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center">
              输入 <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">/</kbd> 快速打开
            </p>
          </div>
        </PopoverContent>
      </Popover>

      {/* 添加指令对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加快捷指令</DialogTitle>
            <DialogDescription>
              创建自定义快捷指令，提高效率
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="command-name">指令名称</Label>
              <Input
                id="command-name"
                placeholder="如：生成周报"
                value={newCommand.name}
                onChange={(e) => setNewCommand(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="command-text">指令内容</Label>
              <Textarea
                id="command-text"
                placeholder="如：请帮我根据本周的工作内容生成周报..."
                value={newCommand.command}
                onChange={(e) => setNewCommand(prev => ({ ...prev, command: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddCommand} disabled={!newCommand.name || !newCommand.command}>
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 横向快捷指令栏
export function QuickCommandBar({
  onSelectCommand,
  className,
}: {
  onSelectCommand: (command: string) => void;
  className?: string;
}) {
  const quickCommands = builtInCommands.slice(0, 4);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {quickCommands.map((cmd) => (
        <Button
          key={cmd.id}
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 px-2"
          onClick={() => onSelectCommand(cmd.command)}
        >
          <span>{cmd.icon}</span>
          {cmd.name}
        </Button>
      ))}
      <QuickCommandPalette
        onSelectCommand={onSelectCommand}
        trigger={
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        }
      />
    </div>
  );
}

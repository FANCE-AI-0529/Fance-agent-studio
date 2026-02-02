import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Bot,
  MessageSquare,
  Settings,
  PlusCircle,
  Search,
  Home,
  Wrench,
  Database,
  Layers,
  Trophy,
  BookOpen,
  Sparkles,
  FileCode,
  Palette,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Zap,
  Terminal,
  FolderOpen,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useDeployedAgents } from "@/hooks/useAgents";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
  group: string;
}

/**
 * P1-09: 全局命令面板
 * - Cmd+K / Ctrl+K 快捷键打开
 * - 快速导航、搜索 Agent、执行操作
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: agents = [] } = useDeployedAgents();

  // Register global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      // Escape to close
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  // Navigation commands
  const navigationCommands: CommandItem[] = useMemo(
    () => [
      {
        id: "home",
        label: "首页",
        icon: Home,
        shortcut: "⌘H",
        action: () => navigate("/"),
        keywords: ["home", "主页", "index"],
        group: "导航",
      },
      {
        id: "runtime",
        label: "对话运行时",
        icon: MessageSquare,
        shortcut: "⌘R",
        action: () => navigate("/runtime"),
        keywords: ["chat", "对话", "聊天", "runtime"],
        group: "导航",
      },
      {
        id: "builder",
        label: "Agent 构建器",
        icon: Layers,
        shortcut: "⌘B",
        action: () => navigate("/builder"),
        keywords: ["build", "构建", "编辑", "画布"],
        group: "导航",
      },
      {
        id: "foundry",
        label: "技能工坊",
        icon: Wrench,
        shortcut: "⌘F",
        action: () => navigate("/foundry"),
        keywords: ["skill", "技能", "工坊", "store"],
        group: "导航",
      },
      {
        id: "knowledge",
        label: "知识库",
        icon: Database,
        action: () => navigate("/knowledge"),
        keywords: ["knowledge", "知识", "文档", "rag"],
        group: "导航",
      },
      {
        id: "leaderboard",
        label: "排行榜",
        icon: Trophy,
        action: () => navigate("/leaderboard"),
        keywords: ["rank", "排行", "榜单"],
        group: "导航",
      },
    ],
    [navigate]
  );

  // Action commands
  const actionCommands: CommandItem[] = useMemo(
    () => [
      {
        id: "new-agent",
        label: "创建新 Agent",
        icon: PlusCircle,
        shortcut: "⌘N",
        action: () => navigate("/builder"),
        keywords: ["new", "create", "新建", "创建"],
        group: "操作",
      },
      {
        id: "new-skill",
        label: "创建新技能",
        icon: FileCode,
        action: () => navigate("/foundry?dev=true"),
        keywords: ["skill", "技能", "新建"],
        group: "操作",
      },
      {
        id: "quick-chat",
        label: "快速对话",
        icon: Zap,
        action: () => navigate("/runtime"),
        keywords: ["chat", "对话", "快速"],
        group: "操作",
      },
    ],
    [navigate]
  );

  // Settings commands
  const settingsCommands: CommandItem[] = useMemo(
    () => [
      {
        id: "theme-light",
        label: "浅色模式",
        icon: Sun,
        action: () => setTheme("light"),
        keywords: ["light", "浅色", "亮色"],
        group: "设置",
      },
      {
        id: "theme-dark",
        label: "深色模式",
        icon: Moon,
        action: () => setTheme("dark"),
        keywords: ["dark", "深色", "暗色"],
        group: "设置",
      },
      {
        id: "theme-system",
        label: "跟随系统",
        icon: Monitor,
        action: () => setTheme("system"),
        keywords: ["system", "系统", "自动"],
        group: "设置",
      },
      {
        id: "settings",
        label: "设置",
        icon: Settings,
        shortcut: "⌘,",
        action: () => navigate("/settings"),
        keywords: ["settings", "设置", "配置"],
        group: "设置",
      },
      ...(user
        ? [
            {
              id: "logout",
              label: "退出登录",
              icon: LogOut,
              action: () => signOut(),
              keywords: ["logout", "退出", "登出"],
              group: "设置",
            },
          ]
        : []),
    ],
    [setTheme, navigate, user, signOut]
  );

  // Agent quick switch
  const agentCommands: CommandItem[] = useMemo(
    () =>
      agents.slice(0, 5).map((agent) => ({
        id: `agent-${agent.id}`,
        label: agent.name,
        icon: Bot,
        action: () => navigate(`/runtime?agent=${agent.id}`),
        keywords: [agent.name, "agent", "对话"],
        group: "快速切换 Agent",
      })),
    [agents, navigate]
  );

  return (
    <>
      {/* Trigger button (optional - can be hidden since we use keyboard shortcut) */}
      <button
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg bg-card/50 hover:bg-card transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>搜索...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="搜索命令、Agent、页面..." />
          <CommandList>
            <CommandEmpty>未找到相关结果</CommandEmpty>

            {/* Navigation */}
            <CommandGroup heading="导航">
              {navigationCommands.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.label + " " + (item.keywords?.join(" ") || "")}
                  onSelect={() => runCommand(item.action)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {/* Actions */}
            <CommandGroup heading="操作">
              {actionCommands.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.label + " " + (item.keywords?.join(" ") || "")}
                  onSelect={() => runCommand(item.action)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            {/* Agents */}
            {agentCommands.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="快速切换 Agent">
                  {agentCommands.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.label + " " + (item.keywords?.join(" ") || "")}
                      onSelect={() => runCommand(item.action)}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            <CommandSeparator />

            {/* Settings */}
            <CommandGroup heading="设置">
              {settingsCommands.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.label + " " + (item.keywords?.join(" ") || "")}
                  onSelect={() => runCommand(item.action)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

/**
 * Hook to programmatically open the command palette
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle, setIsOpen };
}

export default CommandPalette;

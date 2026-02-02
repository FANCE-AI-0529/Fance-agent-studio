import { useState } from "react";
import {
  Bot,
  Brain,
  Cpu,
  Sparkles,
  Shield,
  Zap,
  Globe,
  FileText,
  Database,
  Code,
  MessageSquare,
  Search,
  Settings,
  Users,
  Briefcase,
  Building2,
  GraduationCap,
  HeartPulse,
  Scale,
  Landmark,
  Car,
  Plane,
  ShoppingCart,
  Wallet,
  Calculator,
  Lightbulb,
  Microscope,
  Palette,
  Music,
  Camera,
  Home,
  Leaf,
  // New tech-focused icons
  CircuitBoard,
  Network,
  Terminal,
  Binary,
  Satellite,
  Radar,
  Atom,
  AudioWaveform,
  ScanFace,
  Workflow,
  Fingerprint,
  Eye,
  Layers,
  Server,
  Webhook,
  Cable,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// Icon categories for organized selection
export type IconCategory = "tech" | "business" | "creative" | "general";

// Available icons for agent avatars - Enhanced with tech-focused icons
export const agentAvatarIcons = [
  // AI & Tech icons (prioritized for AI agents)
  { id: "circuit", icon: CircuitBoard, label: "电路", category: "tech" as IconCategory },
  { id: "network", icon: Network, label: "网络", category: "tech" as IconCategory },
  { id: "terminal", icon: Terminal, label: "终端", category: "tech" as IconCategory },
  { id: "binary", icon: Binary, label: "二进制", category: "tech" as IconCategory },
  { id: "satellite", icon: Satellite, label: "卫星", category: "tech" as IconCategory },
  { id: "radar", icon: Radar, label: "雷达", category: "tech" as IconCategory },
  { id: "atom", icon: Atom, label: "原子", category: "tech" as IconCategory },
  { id: "waveform", icon: AudioWaveform, label: "波形", category: "tech" as IconCategory },
  { id: "scan-face", icon: ScanFace, label: "识别", category: "tech" as IconCategory },
  { id: "workflow", icon: Workflow, label: "工作流", category: "tech" as IconCategory },
  { id: "fingerprint", icon: Fingerprint, label: "指纹", category: "tech" as IconCategory },
  { id: "eye", icon: Eye, label: "视觉", category: "tech" as IconCategory },
  { id: "layers", icon: Layers, label: "图层", category: "tech" as IconCategory },
  { id: "server", icon: Server, label: "服务器", category: "tech" as IconCategory },
  { id: "webhook", icon: Webhook, label: "接口", category: "tech" as IconCategory },
  { id: "cable", icon: Cable, label: "连接", category: "tech" as IconCategory },
  
  // Original icons
  { id: "bot", icon: Bot, label: "机器人", category: "tech" as IconCategory },
  { id: "brain", icon: Brain, label: "大脑", category: "tech" as IconCategory },
  { id: "cpu", icon: Cpu, label: "处理器", category: "tech" as IconCategory },
  { id: "sparkles", icon: Sparkles, label: "闪耀", category: "general" as IconCategory },
  { id: "shield", icon: Shield, label: "盾牌", category: "general" as IconCategory },
  { id: "zap", icon: Zap, label: "闪电", category: "general" as IconCategory },
  { id: "globe", icon: Globe, label: "地球", category: "general" as IconCategory },
  { id: "file-text", icon: FileText, label: "文档", category: "business" as IconCategory },
  { id: "database", icon: Database, label: "数据库", category: "tech" as IconCategory },
  { id: "code", icon: Code, label: "代码", category: "tech" as IconCategory },
  { id: "message-square", icon: MessageSquare, label: "消息", category: "business" as IconCategory },
  { id: "search", icon: Search, label: "搜索", category: "general" as IconCategory },
  { id: "settings", icon: Settings, label: "设置", category: "general" as IconCategory },
  { id: "users", icon: Users, label: "用户", category: "business" as IconCategory },
  { id: "briefcase", icon: Briefcase, label: "公文包", category: "business" as IconCategory },
  { id: "building2", icon: Building2, label: "建筑", category: "business" as IconCategory },
  { id: "graduation-cap", icon: GraduationCap, label: "教育", category: "business" as IconCategory },
  { id: "heart-pulse", icon: HeartPulse, label: "医疗", category: "business" as IconCategory },
  { id: "scale", icon: Scale, label: "法律", category: "business" as IconCategory },
  { id: "landmark", icon: Landmark, label: "政府", category: "business" as IconCategory },
  { id: "car", icon: Car, label: "交通", category: "general" as IconCategory },
  { id: "plane", icon: Plane, label: "航空", category: "general" as IconCategory },
  { id: "shopping-cart", icon: ShoppingCart, label: "购物", category: "business" as IconCategory },
  { id: "wallet", icon: Wallet, label: "金融", category: "business" as IconCategory },
  { id: "calculator", icon: Calculator, label: "计算", category: "business" as IconCategory },
  { id: "lightbulb", icon: Lightbulb, label: "创意", category: "creative" as IconCategory },
  { id: "microscope", icon: Microscope, label: "科研", category: "tech" as IconCategory },
  { id: "palette", icon: Palette, label: "设计", category: "creative" as IconCategory },
  { id: "music", icon: Music, label: "音乐", category: "creative" as IconCategory },
  { id: "camera", icon: Camera, label: "摄影", category: "creative" as IconCategory },
  { id: "home", icon: Home, label: "房产", category: "business" as IconCategory },
  { id: "leaf", icon: Leaf, label: "环保", category: "general" as IconCategory },
] as const;

// Available colors for avatar background
export const agentAvatarColors = [
  { id: "primary", className: "bg-primary/20 text-primary", label: "主题色" },
  { id: "blue", className: "bg-blue-500/20 text-blue-500", label: "蓝色" },
  { id: "green", className: "bg-emerald-500/20 text-emerald-500", label: "绿色" },
  { id: "purple", className: "bg-violet-500/20 text-violet-500", label: "紫色" },
  { id: "pink", className: "bg-pink-500/20 text-pink-500", label: "粉色" },
  { id: "orange", className: "bg-orange-500/20 text-orange-500", label: "橙色" },
  { id: "cyan", className: "bg-cyan-500/20 text-cyan-500", label: "青色" },
  { id: "rose", className: "bg-rose-500/20 text-rose-500", label: "玫红" },
  { id: "amber", className: "bg-amber-500/20 text-amber-500", label: "琥珀" },
  { id: "indigo", className: "bg-indigo-500/20 text-indigo-500", label: "靛蓝" },
  { id: "teal", className: "bg-teal-500/20 text-teal-500", label: "蓝绿" },
  { id: "fuchsia", className: "bg-fuchsia-500/20 text-fuchsia-500", label: "品红" },
] as const;

export interface AgentAvatar {
  iconId: string;
  colorId: string;
}

interface AgentAvatarPickerProps {
  avatar: AgentAvatar;
  onChange: (avatar: AgentAvatar) => void;
  size?: "sm" | "md" | "lg";
}

export function getAvatarIcon(iconId: string) {
  return agentAvatarIcons.find((i) => i.id === iconId) || agentAvatarIcons[0];
}

export function getAvatarColor(colorId: string) {
  return agentAvatarColors.find((c) => c.id === colorId) || agentAvatarColors[0];
}

export function AgentAvatarDisplay({
  avatar,
  size = "md",
  className,
}: {
  avatar: AgentAvatar;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const iconConfig = getAvatarIcon(avatar.iconId);
  const colorConfig = getAvatarColor(avatar.colorId);
  const IconComponent = iconConfig.icon;

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  };

  return (
    <div
      className={cn(
        "rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
        sizeClasses[size],
        colorConfig.className,
        className
      )}
    >
      <IconComponent className={iconSizes[size]} />
    </div>
  );
}

export function AgentAvatarPicker({
  avatar,
  onChange,
  size = "md",
}: AgentAvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"icon" | "color">("icon");

  const handleIconSelect = (iconId: string) => {
    onChange({ ...avatar, iconId });
  };

  const handleColorSelect = (colorId: string) => {
    onChange({ ...avatar, colorId });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="p-1 h-auto hover:bg-accent/50 rounded-xl group relative"
        >
          <AgentAvatarDisplay avatar={avatar} size={size} />
          <div className="absolute inset-0 rounded-xl bg-background/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-[10px] font-medium">更换</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-3">
            <AgentAvatarDisplay avatar={avatar} size="lg" />
            <div>
              <h4 className="font-medium text-sm">自定义头像</h4>
              <p className="text-xs text-muted-foreground">
                选择图标和颜色来个性化你的 Agent
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border">
          <button
            className={cn(
              "flex-1 py-2 text-sm font-medium transition-colors",
              activeTab === "icon"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("icon")}
          >
            图标
          </button>
          <button
            className={cn(
              "flex-1 py-2 text-sm font-medium transition-colors",
              activeTab === "color"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("color")}
          >
            颜色
          </button>
        </div>

        <ScrollArea className="h-[200px]">
          {activeTab === "icon" ? (
            <div className="p-3 grid grid-cols-6 gap-2">
              {agentAvatarIcons.map((iconConfig) => {
                const IconComponent = iconConfig.icon;
                const isSelected = avatar.iconId === iconConfig.id;
                const colorConfig = getAvatarColor(avatar.colorId);

                return (
                  <button
                    key={iconConfig.id}
                    onClick={() => handleIconSelect(iconConfig.id)}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110",
                      isSelected
                        ? cn(colorConfig.className, "ring-2 ring-primary ring-offset-2 ring-offset-background")
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                    title={iconConfig.label}
                  >
                    <IconComponent className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 grid grid-cols-4 gap-3">
              {agentAvatarColors.map((colorConfig) => {
                const isSelected = avatar.colorId === colorConfig.id;
                const iconConfig = getAvatarIcon(avatar.iconId);
                const IconComponent = iconConfig.icon;

                return (
                  <button
                    key={colorConfig.id}
                    onClick={() => handleColorSelect(colorConfig.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all hover:scale-105",
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "hover:bg-muted/50"
                    )}
                    title={colorConfig.label}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        colorConfig.className
                      )}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {colorConfig.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default AgentAvatarPicker;

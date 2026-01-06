import {
  Layers,
  Globe,
  Cloud,
  Database,
  Terminal,
  MessageCircle,
  Wrench,
  FolderOpen,
  Brain,
  Search,
  Shield,
  GitBranch,
  Zap,
  Image,
  Music,
  Map,
  Clock,
  FileText,
  Monitor,
  Settings,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface MCPCategory {
  id: string;
  label: string;
  labelZh: string;
  icon: LucideIcon;
  color: string;
}

export const mcpCategories: MCPCategory[] = [
  { id: "aggregators", label: "Aggregators", labelZh: "聚合器", icon: Layers, color: "text-purple-500" },
  { id: "browser", label: "Browser Automation", labelZh: "浏览器自动化", icon: Globe, color: "text-blue-500" },
  { id: "cloud", label: "Cloud Platforms", labelZh: "云平台", icon: Cloud, color: "text-sky-500" },
  { id: "database", label: "Databases", labelZh: "数据库", icon: Database, color: "text-green-500" },
  { id: "code_execution", label: "Code Execution", labelZh: "代码执行", icon: Terminal, color: "text-orange-500" },
  { id: "communication", label: "Communication", labelZh: "通信", icon: MessageCircle, color: "text-pink-500" },
  { id: "dev_tools", label: "Developer Tools", labelZh: "开发工具", icon: Wrench, color: "text-gray-500" },
  { id: "file_systems", label: "File Systems", labelZh: "文件系统", icon: FolderOpen, color: "text-yellow-500" },
  { id: "knowledge", label: "Knowledge & Memory", labelZh: "知识与记忆", icon: Brain, color: "text-violet-500" },
  { id: "search", label: "Search & Retrieval", labelZh: "搜索与检索", icon: Search, color: "text-cyan-500" },
  { id: "security", label: "Security", labelZh: "安全", icon: Shield, color: "text-red-500" },
  { id: "version_control", label: "Version Control", labelZh: "版本控制", icon: GitBranch, color: "text-emerald-500" },
  { id: "productivity", label: "Productivity", labelZh: "效率工具", icon: Zap, color: "text-amber-500" },
  { id: "image", label: "Image & Media", labelZh: "图像与媒体", icon: Image, color: "text-fuchsia-500" },
  { id: "audio", label: "Audio", labelZh: "音频", icon: Music, color: "text-rose-500" },
  { id: "location", label: "Location", labelZh: "位置服务", icon: Map, color: "text-teal-500" },
  { id: "time", label: "Time & Scheduling", labelZh: "时间与调度", icon: Clock, color: "text-indigo-500" },
  { id: "documents", label: "Documents", labelZh: "文档处理", icon: FileText, color: "text-lime-500" },
  { id: "monitoring", label: "Monitoring", labelZh: "监控", icon: Monitor, color: "text-slate-500" },
  { id: "automation", label: "Automation", labelZh: "自动化", icon: Workflow, color: "text-blue-400" },
  { id: "identity", label: "Identity", labelZh: "身份认证", icon: Users, color: "text-orange-400" },
  { id: "other", label: "Other", labelZh: "其他", icon: Settings, color: "text-gray-400" },
];

export const getMCPCategoryById = (id: string): MCPCategory | undefined => {
  return mcpCategories.find((cat) => cat.id === id);
};

export const getMCPCategoryIcon = (categoryId: string): LucideIcon => {
  const category = getMCPCategoryById(categoryId);
  return category?.icon || Settings;
};

// Runtime environment icons and labels
export const runtimeEnvConfig: Record<string, { emoji: string; label: string; color: string }> = {
  python: { emoji: "🐍", label: "Python", color: "text-yellow-600" },
  node: { emoji: "📇", label: "TypeScript/Node", color: "text-blue-600" },
  go: { emoji: "🏎️", label: "Go", color: "text-cyan-600" },
  rust: { emoji: "🦀", label: "Rust", color: "text-orange-600" },
  csharp: { emoji: "🔷", label: "C#/.NET", color: "text-purple-600" },
  java: { emoji: "☕", label: "Java/Kotlin", color: "text-red-600" },
};

// Scope icons
export const scopeConfig: Record<string, { emoji: string; label: string }> = {
  cloud: { emoji: "☁️", label: "Cloud" },
  local: { emoji: "🏠", label: "Local" },
  embedded: { emoji: "📦", label: "Embedded" },
};

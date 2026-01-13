import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart2,
  FileText,
  Lightbulb,
  Wallet,
  Calculator,
  AlertTriangle,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  File,
  PenTool,
  Languages,
  Search,
  BookOpen,
  Code,
  Headphones,
  MessageCircle,
  Sparkles,
  Image,
  Database,
  PieChart,
  Zap,
  Plug,
  Globe,
  Folder,
  Github,
  Clipboard,
  Book,
  ArrowRight,
  Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { extractAgentCapabilities, StructuredCapabilities, CapabilityItem } from "@/utils/capabilityExtractor";
import { AgentAvatarDisplay, AgentAvatar } from "@/components/builder/AgentAvatarPicker";
import { Agent } from "@/hooks/useAgents";

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  "bar-chart-2": BarChart2,
  "file-text": FileText,
  "lightbulb": Lightbulb,
  "wallet": Wallet,
  "calculator": Calculator,
  "alert-triangle": AlertTriangle,
  "mail": Mail,
  "message-square": MessageSquare,
  "calendar": Calendar,
  "clock": Clock,
  "file": File,
  "pen-tool": PenTool,
  "languages": Languages,
  "search": Search,
  "book-open": BookOpen,
  "code": Code,
  "headphones": Headphones,
  "message-circle": MessageCircle,
  "sparkles": Sparkles,
  "image": Image,
  "database": Database,
  "pie-chart": PieChart,
  "zap": Zap,
  "plug": Plug,
  "globe": Globe,
  "folder": Folder,
  "github": Github,
  "clipboard": Clipboard,
  "book": Book,
};

interface EnhancedWelcomeCardProps {
  agent: Agent | null;
  onQuickStart: (command: string) => void;
}

// Helper to get avatar from agent manifest
function getAgentAvatar(agent: Agent | null): AgentAvatar {
  if (!agent) return { iconId: "sparkles", colorId: "primary" };
  const manifest = agent.manifest as any;
  if (manifest?.avatar) {
    return manifest.avatar as AgentAvatar;
  }
  return { iconId: "sparkles", colorId: "primary" };
}

// Capability Card Component
function CapabilityCard({ 
  capability, 
  variant = "core",
  index 
}: { 
  capability: CapabilityItem; 
  variant?: "core" | "extended";
  index: number;
}) {
  const IconComponent = ICON_MAP[capability.icon] || Sparkles;
  
  const variantStyles = {
    core: "bg-primary/10 border-primary/30 hover:bg-primary/15",
    extended: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15",
  };
  
  const iconStyles = {
    core: "bg-primary/20 text-primary",
    extended: "bg-blue-500/20 text-blue-500",
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all cursor-default",
        variantStyles[variant]
      )}
    >
      <div className={cn("p-2 rounded-lg", iconStyles[variant])}>
        <IconComponent className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium text-center">{capability.label}</span>
      {capability.description && (
        <span className="text-xs text-muted-foreground text-center line-clamp-2">
          {capability.description}
        </span>
      )}
    </motion.div>
  );
}

// Quick Start Button
function QuickStartButton({ 
  text, 
  onClick,
  index 
}: { 
  text: string; 
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.05 }}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-3 w-full p-3 rounded-lg",
        "bg-muted/50 hover:bg-accent/50 border border-transparent hover:border-border",
        "text-left transition-all group"
      )}
    >
      <span className="text-sm text-foreground">{text}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
    </motion.button>
  );
}

// Knowledge Badge
function KnowledgeBadge({ name, index }: { name: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.25 + index * 0.03 }}
    >
      <Badge 
        variant="outline" 
        className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1"
      >
        <BookOpen className="h-3 w-3" />
        {name}
      </Badge>
    </motion.div>
  );
}

export function EnhancedWelcomeCard({ agent, onQuickStart }: EnhancedWelcomeCardProps) {
  const avatar = getAgentAvatar(agent);
  
  // Extract capabilities
  const capabilities = useMemo<StructuredCapabilities>(() => {
    if (!agent) {
      return {
        core: [],
        extended: [],
        knowledge: [],
        quickStarts: ["有什么可以帮助你的吗？"],
        greeting: "你好！我是你的智能助手。",
      };
    }
    
    const manifest = agent.manifest as any;
    return extractAgentCapabilities(
      agent.name,
      manifest?.systemPrompt || "",
      manifest
    );
  }, [agent]);
  
  const agentName = agent?.name || "智能助手";
  const department = agent?.department || "";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/30">
          <div className="flex items-center gap-4">
            <AgentAvatarDisplay avatar={avatar} size="lg" className="w-14 h-14" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{agentName}</h2>
              {department && (
                <p className="text-sm text-muted-foreground">{department}</p>
              )}
            </div>
          </div>
          
          {/* Greeting */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-base text-foreground"
          >
            {capabilities.greeting}
          </motion.p>
        </div>
        
        <CardContent className="p-6 space-y-6">
          {/* Core Capabilities */}
          {capabilities.core.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">我的核心能力</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {capabilities.core.map((cap, i) => (
                  <CapabilityCard key={cap.label} capability={cap} variant="core" index={i} />
                ))}
              </div>
            </div>
          )}
          
          {/* Extended Capabilities */}
          {capabilities.extended.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">还可以帮你</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {capabilities.extended.map((cap, i) => (
                  <motion.div
                    key={cap.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.03 }}
                  >
                    <Badge 
                      variant="outline" 
                      className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1.5 py-1.5 px-3"
                    >
                      {React.createElement(ICON_MAP[cap.icon] || Sparkles, { className: "h-3.5 w-3.5" })}
                      {cap.label}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          
          {/* Knowledge Bases */}
          {capabilities.knowledge.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">我的知识储备</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {capabilities.knowledge.map((kb, i) => (
                  <KnowledgeBadge key={kb} name={kb} index={i} />
                ))}
              </div>
            </div>
          )}
          
          {/* Quick Starts */}
          {capabilities.quickStarts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">快速开始</span>
              </div>
              <div className="space-y-2">
                {capabilities.quickStarts.map((qs, i) => (
                  <QuickStartButton 
                    key={qs} 
                    text={qs} 
                    onClick={() => onQuickStart(qs)}
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default EnhancedWelcomeCard;

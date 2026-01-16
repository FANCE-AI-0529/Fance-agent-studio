import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { type AgentMeta, ROLE_THEMES, parseAgentMeta } from "@/constants/agentRoleThemes";
import { FormattedText } from "./FormattedText";
import { motion } from "framer-motion";

interface SmartChatBubbleProps {
  content: string;
  className?: string;
  /** Force a specific role theme (overrides auto-detection from content) */
  agentMeta?: AgentMeta;
  /** Whether to show the role badge header */
  showRoleBadge?: boolean;
  /** Whether this is a new message (for animations) */
  isNew?: boolean;
}

/**
 * SmartChatBubble - Role-aware message container
 * 智能气泡组件 - 根据角色自动换皮肤
 * 
 * Features:
 * - Auto-parses <meta role="..." /> from content
 * - Applies role-specific themes (colors, backgrounds, animations)
 * - Renders role badge with icon
 * - Uses semantic highlight pills for **bold** text
 */
export function SmartChatBubble({
  content,
  className,
  agentMeta: externalMeta,
  showRoleBadge = true,
  isNew = false,
}: SmartChatBubbleProps) {
  // Parse meta from content if not provided externally
  const { meta: parsedMeta, cleanContent } = parseAgentMeta(content);
  const agentMeta = externalMeta || parsedMeta;
  
  // Get theme based on role
  const theme = agentMeta ? ROLE_THEMES[agentMeta.role] : null;
  const IconComponent = theme?.icon;
  
  // Determine mood-based animation class
  const getMoodClass = () => {
    if (!agentMeta?.mood) return '';
    switch (agentMeta.mood) {
      case 'warning':
        return 'animate-pulse-warning';
      case 'success':
        return 'glow-success';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative rounded-2xl rounded-bl-md overflow-hidden",
        // Apply role-specific bubble class if available
        theme?.bubbleClass,
        // Add mood-based animation
        getMoodClass(),
        className
      )}
    >
      {/* Role Badge Header */}
      {showRoleBadge && theme && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] gap-1.5 h-5 font-medium border",
              theme.badgeClass
            )}
          >
            {IconComponent && <IconComponent className="h-3 w-3" />}
            {theme.labelCn}
          </Badge>
          {agentMeta?.tool && (
            <span className="text-[10px] text-muted-foreground">
              · {agentMeta.tool}
            </span>
          )}
        </div>
      )}
      
      {/* Content Area */}
      <div className={cn(
        "px-4 py-3",
        !showRoleBadge && "pt-4",
        // Engineer role uses monospace
        agentMeta?.role === 'engineer' && "font-mono"
      )}>
        <FormattedText
          content={cleanContent}
          className={cn(
            "text-sm leading-relaxed",
            theme?.textClass
          )}
          agentRole={agentMeta?.role}
          useTerminalStyle={true}
        />
      </div>
    </motion.div>
  );
}

export default SmartChatBubble;

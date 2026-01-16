// =====================================================
// Agent Role Theme System
// 智能体角色主题系统 - 语义化高亮
// =====================================================

import { Ruler, Terminal, BookOpen, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Agent Role Types
 * 智能体角色类型
 */
export type AgentRole = 'architect' | 'engineer' | 'researcher' | 'auditor';

/**
 * Agent Mood Types
 * 智能体情绪状态
 */
export type AgentMood = 'neutral' | 'warning' | 'success';

/**
 * Agent Metadata Interface
 * 智能体元数据接口
 */
export interface AgentMeta {
  role: AgentRole;
  mood?: AgentMood;
  tool?: string;  // Currently active skill/tool
}

/**
 * Role Theme Configuration
 * 角色主题配置
 */
export interface RoleTheme {
  label: string;
  labelCn: string;
  icon: LucideIcon;
  // CSS classes
  borderClass: string;
  bubbleClass: string;
  highlightClass: string;
  textClass: string;
  badgeClass: string;
  // HSL color for dynamic usage
  hslColor: string;
}

/**
 * Role Theme Definitions
 * 角色主题定义
 */
export const ROLE_THEMES: Record<AgentRole, RoleTheme> = {
  architect: {
    label: 'Architect',
    labelCn: '架构师',
    icon: Ruler,
    borderClass: 'border-l-role-architect-border',
    bubbleClass: 'bubble-architect',
    highlightClass: 'highlight-pill-architect',
    textClass: 'text-role-architect-text',
    badgeClass: 'bg-role-architect-bg text-role-architect-text border-role-architect-border',
    hslColor: '38 92% 50%',  // amber
  },
  engineer: {
    label: 'Engineer',
    labelCn: '工程师',
    icon: Terminal,
    borderClass: 'border-l-role-engineer-border',
    bubbleClass: 'bubble-engineer',
    highlightClass: 'highlight-pill-engineer',
    textClass: 'text-role-engineer-text',
    badgeClass: 'bg-role-engineer-bg text-role-engineer-text border-role-engineer-border',
    hslColor: '187 85% 43%',  // cyan
  },
  researcher: {
    label: 'Researcher',
    labelCn: '研究员',
    icon: BookOpen,
    borderClass: 'border-l-role-researcher-border',
    bubbleClass: 'bubble-researcher',
    highlightClass: 'highlight-pill-researcher',
    textClass: 'text-role-researcher-text',
    badgeClass: 'bg-role-researcher-bg text-role-researcher-text border-role-researcher-border',
    hslColor: '263 70% 66%',  // violet
  },
  auditor: {
    label: 'Auditor',
    labelCn: '审计员',
    icon: ShieldAlert,
    borderClass: 'border-l-role-auditor-border',
    bubbleClass: 'bubble-auditor',
    highlightClass: 'highlight-pill-auditor',
    textClass: 'text-role-auditor-text',
    badgeClass: 'bg-role-auditor-bg text-role-auditor-text border-role-auditor-border',
    hslColor: '347 77% 50%',  // rose
  },
};

/**
 * Parse agent meta from response content
 * 从响应内容中解析智能体元数据
 * 
 * @param content - The raw response content
 * @returns Parsed meta and cleaned content
 */
export function parseAgentMeta(content: string): { meta: AgentMeta | null; cleanContent: string } {
  // Match <meta role="..." mood="..." tool="..." /> at the beginning
  const metaRegex = /^<meta\s+role="(\w+)"(?:\s+mood="(\w+)")?(?:\s+tool="([^"]+)")?\s*\/>\s*/;
  const match = content.match(metaRegex);
  
  if (match) {
    const role = match[1] as AgentRole;
    // Validate role is one of the known roles
    if (role in ROLE_THEMES) {
      return {
        meta: {
          role,
          mood: (match[2] as AgentMood) || 'neutral',
          tool: match[3],
        },
        cleanContent: content.replace(metaRegex, ''),
      };
    }
  }
  
  return { meta: null, cleanContent: content };
}

/**
 * Get role theme by role name
 * 根据角色名获取主题
 */
export function getRoleTheme(role: AgentRole): RoleTheme {
  return ROLE_THEMES[role];
}

/**
 * Get default role (for fallback)
 */
export function getDefaultRole(): AgentRole {
  return 'engineer';
}

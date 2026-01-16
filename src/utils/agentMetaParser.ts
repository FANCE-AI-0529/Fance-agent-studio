// =====================================================
// Agent Meta Parser Utility
// 智能体元数据解析工具
// =====================================================

import { type AgentMeta, type AgentRole, ROLE_THEMES } from '@/constants/agentRoleThemes';

/**
 * Extract agent meta from streaming content
 * 从流式内容中提取智能体元数据
 * 
 * @param content - The content chunk or full content
 * @returns Object with meta (if found) and display content (meta stripped)
 */
export function extractAgentMeta(content: string): {
  meta: AgentMeta | null;
  displayContent: string;
} {
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
          mood: (match[2] as 'neutral' | 'warning' | 'success') || 'neutral',
          tool: match[3],
        },
        displayContent: content.replace(metaRegex, ''),
      };
    }
  }
  
  return { meta: null, displayContent: content };
}

/**
 * Check if content starts with meta tag (for early detection in streaming)
 * 检查内容是否以 meta 标签开头（用于流式传输中的早期检测）
 */
export function hasMetaPrefix(content: string): boolean {
  return content.trimStart().startsWith('<meta');
}

/**
 * Strip meta tag from content if present
 * 如果存在则从内容中删除 meta 标签
 */
export function stripMetaTag(content: string): string {
  const metaRegex = /^<meta\s+[^>]*\/>\s*/;
  return content.replace(metaRegex, '');
}

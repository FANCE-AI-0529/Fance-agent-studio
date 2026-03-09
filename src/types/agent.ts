/**
 * @file agent.ts
 * @description 智能体核心类型定义 - Agent Core Type Definitions
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */

import type { AgentAvatar } from "@/components/builder/AgentAvatarPicker";
import type { Json } from "@/integrations/supabase/types";

// =====================================================
// 智能体 Manifest 运行时类型
// Agent Manifest Runtime Shape (JSON blob from DB)
// =====================================================

/**
 * 智能体 Manifest 的运行时形态
 * 这是存储在数据库 agents.manifest JSONB 列中的实际结构
 */
export interface AgentManifestRuntime {
  /** 智能体图标 ID */
  iconId?: string;
  /** 智能体颜色 ID */
  colorId?: string;
  /** 结构化头像配置 */
  avatar?: AgentAvatar;
  /** 智能体描述 */
  description?: string;
  /** 原始描述（AI 生成前的用户输入） */
  originalDescription?: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 网络搜索开关 */
  webSearchEnabled?: boolean;
  /** 挂载的知识库配置 */
  knowledgeBases?: Array<{
    id: string;
    name: string;
    retrievalMode?: string;
    topK?: number;
  }>;
  /** 人格配置 */
  personalityConfig?: Record<string, unknown>;
  /** 构建元数据 */
  buildMetadata?: Record<string, unknown>;
  /** 额外配置（扩展字段） */
  [key: string]: unknown;
}

/**
 * 从 Json 类型安全地解析 Manifest
 */
export function parseManifest(raw: Json | null | undefined): AgentManifestRuntime {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  return raw as unknown as AgentManifestRuntime;
}

/**
 * @file memorySync.ts
 * @description 记忆同步服务 - Memory Synchronization Service
 * @author Fance Studio
 * @copyright Copyright (c) 2025 Fance Studio. MIT License.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * 记忆片段类型
 */
export type MemorySection = 
  | 'identity'         // 身份信息
  | 'task_plan'        // 任务计划
  | 'progress'         // 当前进度
  | 'preferences'      // 偏好设置
  | 'knowledge'        // 知识积累
  | 'relationships'    // 与其他 Agent 的关系
  | 'pending_tasks';   // 未完成任务

export interface MemoryFragment {
  section: MemorySection;
  key: string;
  value: string;
  priority: number;
  updatedAt: Date;
  readOnly: boolean;
}

export interface ClaudeMdStructure {
  raw: string;
  sections: Map<MemorySection, MemoryFragment[]>;
  metadata: {
    agentId: string;
    agentName: string;
    lastSyncAt: Date;
    version: number;
  };
}

/**
 * 记忆同步服务
 */
export class MemorySyncService {
  /**
   * 从 CLAUDE.md 解析结构化记忆
   */
  parseClaudeMd(content: string): Map<MemorySection, MemoryFragment[]> {
    const sections = new Map<MemorySection, MemoryFragment[]>();
    
    const sectionMap: Record<string, MemorySection> = {
      '身份': 'identity',
      'identity': 'identity',
      '任务计划': 'task_plan',
      'task plan': 'task_plan',
      '进度': 'progress',
      'progress': 'progress',
      '偏好': 'preferences',
      'preferences': 'preferences',
      '知识': 'knowledge',
      'knowledge': 'knowledge',
      '关系': 'relationships',
      'relationships': 'relationships',
      '未完成任务': 'pending_tasks',
      'pending tasks': 'pending_tasks',
    };

    // 按 ## 标题分割
    const lines = content.split('\n');
    let currentSection: MemorySection | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^##\s+(.+)$/);
      if (headerMatch) {
        // 保存前一个 section
        if (currentSection && currentContent.length > 0) {
          sections.set(currentSection, this.parseFragments(currentSection, currentContent.join('\n')));
        }

        const sectionTitle = headerMatch[1].toLowerCase().trim();
        currentSection = sectionMap[sectionTitle] || null;
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // 保存最后一个 section
    if (currentSection && currentContent.length > 0) {
      sections.set(currentSection, this.parseFragments(currentSection, currentContent.join('\n')));
    }

    return sections;
  }

  /**
   * 解析 section 内的片段
   */
  private parseFragments(section: MemorySection, content: string): MemoryFragment[] {
    const fragments: MemoryFragment[] = [];
    
    // 解析 - key: value 格式
    const lines = content.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const kvMatch = line.match(/^-\s+\*?\*?(.+?)\*?\*?:\s+(.+)$/);
      if (kvMatch) {
        fragments.push({
          section,
          key: kvMatch[1].trim(),
          value: kvMatch[2].trim(),
          priority: section === 'identity' ? 10 : section === 'task_plan' ? 8 : 5,
          updatedAt: new Date(),
          readOnly: section === 'identity',
        });
      } else if (line.startsWith('- ')) {
        fragments.push({
          section,
          key: `item_${fragments.length}`,
          value: line.substring(2).trim(),
          priority: 5,
          updatedAt: new Date(),
          readOnly: false,
        });
      }
    }

    return fragments;
  }

  /**
   * 生成 CLAUDE.md 内容
   */
  generateClaudeMd(
    agentName: string,
    sections: Map<MemorySection, MemoryFragment[]>
  ): string {
    const sectionTitles: Record<MemorySection, string> = {
      identity: '身份 (Identity)',
      task_plan: '任务计划 (Task Plan)',
      progress: '进度 (Progress)',
      preferences: '偏好 (Preferences)',
      knowledge: '知识 (Knowledge)',
      relationships: '关系 (Relationships)',
      pending_tasks: '未完成任务 (Pending Tasks)',
    };

    const sectionOrder: MemorySection[] = [
      'identity', 'task_plan', 'progress', 'pending_tasks',
      'preferences', 'knowledge', 'relationships',
    ];

    let md = `# ${agentName} - CLAUDE.md\n\n`;
    md += `> 自动生成于 ${new Date().toISOString()}\n\n`;

    for (const section of sectionOrder) {
      const fragments = sections.get(section);
      if (!fragments || fragments.length === 0) continue;

      md += `## ${sectionTitles[section]}\n\n`;
      for (const fragment of fragments) {
        if (fragment.key.startsWith('item_')) {
          md += `- ${fragment.value}\n`;
        } else {
          md += `- **${fragment.key}**: ${fragment.value}\n`;
        }
      }
      md += '\n';
    }

    return md;
  }

  /**
   * 同步到数据库（core_memories 表）
   */
  async syncToDatabase(
    agentId: string,
    userId: string,
    sections: Map<MemorySection, MemoryFragment[]>
  ): Promise<void> {
    for (const [section, fragments] of sections) {
      for (const fragment of fragments) {
        const { error } = await supabase
          .from('core_memories')
          .upsert({
            agent_id: agentId,
            user_id: userId,
            category: section,
            key: fragment.key,
            value: fragment.value,
            priority: fragment.priority,
            is_read_only: fragment.readOnly,
          }, {
            onConflict: 'agent_id,key',
            ignoreDuplicates: false,
          });

        if (error) {
          console.error(`[MemorySync] Failed to sync fragment ${fragment.key}:`, error);
        }
      }
    }
  }

  /**
   * 从数据库加载记忆
   */
  async loadFromDatabase(
    agentId: string,
    userId: string
  ): Promise<Map<MemorySection, MemoryFragment[]>> {
    const { data, error } = await supabase
      .from('core_memories')
      .select('*')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .order('priority', { ascending: false });

    if (error) throw error;

    const sections = new Map<MemorySection, MemoryFragment[]>();
    
    for (const row of data || []) {
      const section = row.category as MemorySection;
      if (!sections.has(section)) {
        sections.set(section, []);
      }
      sections.get(section)!.push({
        section,
        key: row.key,
        value: row.value,
        priority: row.priority || 5,
        updatedAt: new Date(row.updated_at || row.created_at || Date.now()),
        readOnly: row.is_read_only || false,
      });
    }

    return sections;
  }

  /**
   * 通过 Edge Function 同步 NanoClaw 容器中的 CLAUDE.md
   */
  async syncWithContainer(
    agentId: string,
    containerId: string,
    direction: 'to_container' | 'from_container'
  ): Promise<void> {
    const { error } = await supabase.functions.invoke('nanoclaw-memory', {
      body: {
        action: direction === 'to_container' ? 'write' : 'read',
        agentId,
        containerId,
      },
    });

    if (error) throw error;
  }

  /**
   * 提取未完成任务
   */
  extractPendingTasks(sections: Map<MemorySection, MemoryFragment[]>): string[] {
    const pendingFragments = sections.get('pending_tasks') || [];
    return pendingFragments.map(f => f.value);
  }
}

/**
 * 单例
 */
export const memorySyncService = new MemorySyncService();

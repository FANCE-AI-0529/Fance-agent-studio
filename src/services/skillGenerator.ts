// 动态 Skill 生成器 (Dynamic Skill Generator - Vibe Coding)

import { supabase } from '@/integrations/supabase/client';

/**
 * SKILL.md 结构
 */
export interface SkillMdStructure {
  name: string;
  description: string;
  triggers: string[];
  inputs: SkillInput[];
  outputs: SkillOutput[];
  steps: string[];
  constraints: string[];
  examples: SkillExample[];
  allowedTools: string[];
  format: 'studio' | 'nanoclaw_native';
}

export interface SkillInput {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface SkillOutput {
  name: string;
  type: string;
  description: string;
}

export interface SkillExample {
  input: string;
  expectedOutput: string;
}

export interface SkillGenerateRequest {
  description: string;
  agentId?: string;
  targetRuntime: 'cloud' | 'nanoclaw';
  category?: string;
  constraints?: string[];
}

export interface SkillGenerateResult {
  success: boolean;
  skillMd?: string;
  structure?: SkillMdStructure;
  edgeFunctionCode?: string;
  error?: string;
}

/**
 * Skill 生成器
 */
export class SkillGenerator {
  /**
   * 从自然语言生成 SKILL.md
   */
  async generate(request: SkillGenerateRequest): Promise<SkillGenerateResult> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-skill-template', {
        body: {
          description: request.description,
          targetRuntime: request.targetRuntime,
          category: request.category,
          constraints: request.constraints,
          format: 'skill_md',
        },
      });

      if (error) throw error;

      const structure = this.parseSkillMd(data.content);

      return {
        success: true,
        skillMd: data.content,
        structure,
        edgeFunctionCode: data.edgeFunctionCode,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Generation failed',
      };
    }
  }

  /**
   * 解析 SKILL.md 为结构化数据
   */
  parseSkillMd(content: string): SkillMdStructure {
    const structure: SkillMdStructure = {
      name: '',
      description: '',
      triggers: [],
      inputs: [],
      outputs: [],
      steps: [],
      constraints: [],
      examples: [],
      allowedTools: [],
      format: 'studio',
    };

    // Detect NanoClaw native format (allowed-tools in frontmatter)
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const allowedToolsMatch = frontmatter.match(/allowed-tools:\s*(.+)/);
      if (allowedToolsMatch) {
        structure.allowedTools = allowedToolsMatch[1].split(',').map(t => t.trim());
        structure.format = 'nanoclaw_native';
      }
      const nameMatch = frontmatter.match(/name:\s*(.+)/);
      if (nameMatch) structure.name = nameMatch[1].trim();
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      if (descMatch) structure.description = descMatch[1].trim();
    }

    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      // 标题
      const h1Match = line.match(/^#\s+(.+)$/);
      if (h1Match) {
        structure.name = h1Match[1].trim();
        continue;
      }

      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        currentSection = h2Match[1].toLowerCase().trim();
        continue;
      }

      // 描述段
      if (currentSection === '' && line.trim() && !line.startsWith('#')) {
        structure.description += (structure.description ? ' ' : '') + line.trim();
        continue;
      }

      // 列表项
      const listMatch = line.match(/^-\s+(.+)$/);
      if (listMatch) {
        const item = listMatch[1].trim();
        switch (currentSection) {
          case 'triggers':
          case '触发条件':
            structure.triggers.push(item);
            break;
          case 'steps':
          case '执行步骤':
            structure.steps.push(item);
            break;
          case 'constraints':
          case '约束':
            structure.constraints.push(item);
            break;
        }
      }
    }

    return structure;
  }

  /**
   * 生成 SKILL.md 文本
   */
  generateSkillMd(structure: SkillMdStructure): string {
    let md = `# ${structure.name}\n\n`;
    md += `${structure.description}\n\n`;

    if (structure.triggers.length) {
      md += `## 触发条件 (Triggers)\n\n`;
      structure.triggers.forEach(t => { md += `- ${t}\n`; });
      md += '\n';
    }

    if (structure.inputs.length) {
      md += `## 输入 (Inputs)\n\n`;
      structure.inputs.forEach(i => {
        md += `- **${i.name}** (${i.type}${i.required ? ', required' : ''}): ${i.description}\n`;
      });
      md += '\n';
    }

    if (structure.outputs.length) {
      md += `## 输出 (Outputs)\n\n`;
      structure.outputs.forEach(o => {
        md += `- **${o.name}** (${o.type}): ${o.description}\n`;
      });
      md += '\n';
    }

    if (structure.steps.length) {
      md += `## 执行步骤 (Steps)\n\n`;
      structure.steps.forEach((s, i) => { md += `${i + 1}. ${s}\n`; });
      md += '\n';
    }

    if (structure.constraints.length) {
      md += `## 约束 (Constraints)\n\n`;
      structure.constraints.forEach(c => { md += `- ${c}\n`; });
      md += '\n';
    }

    if (structure.examples.length) {
      md += `## 示例 (Examples)\n\n`;
      structure.examples.forEach((e, i) => {
        md += `### Example ${i + 1}\n`;
        md += `**Input:** ${e.input}\n`;
        md += `**Expected Output:** ${e.expectedOutput}\n\n`;
      });
    }

    return md;
  }

  /**
   * 生成 NanoClaw 原生格式 SKILL.md
   */
  generateNativeSkillMd(opts: {
    name: string;
    description: string;
    allowedTools: string;
    body: string;
  }): string {
    return `---
name: ${opts.name}
description: ${opts.description}
allowed-tools: ${opts.allowedTools}
---

${opts.body}`;
  }

  /**
   * 部署 Skill 到 NanoClaw 容器
   */
  async deployToContainer(
    skillMd: string,
    skillName: string,
    containerId: string,
    nanoclawEndpoint: string,
    authToken: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
        body: {
          action: 'deploy_skill',
          containerId,
          skillName,
          skillMd,
          nanoclawEndpoint,
          authToken,
        },
      });

      if (error) throw error;
      return { success: true, path: data.path };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Deploy failed',
      };
    }
  }
}

export const skillGenerator = new SkillGenerator();

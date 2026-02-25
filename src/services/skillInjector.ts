/**
 * 技能注入与生命周期管理服务
 * 批量注入核心技能到 NanoClaw 容器的 .claude/skills/ 目录
 */

import { supabase } from '@/integrations/supabase/client';
import { CORE_SKILL_PROMPTS, CORE_SKILL_MAP, type CoreSkillPrompt } from '@/constants/coreSkillPrompts';
import type {
  SkillState,
  SkillInjectionResult,
} from '@/types/nanoclawSkills';

// ── Client-side operation mutex ────────────────────────────────
const activeOperations = new Map<string, Promise<unknown>>();

function withContainerMutex<T>(
  containerId: string,
  operation: () => Promise<T>
): Promise<T> {
  const existing = activeOperations.get(containerId);
  const chained = (existing ?? Promise.resolve()).then(operation, operation);
  activeOperations.set(containerId, chained);
  chained.finally(() => {
    if (activeOperations.get(containerId) === chained) {
      activeOperations.delete(containerId);
    }
  });
  return chained;
}

// ── Semver comparison utility ──────────────────────────────────
function semverSatisfies(current: string, required: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [cMajor = 0, cMinor = 0, cPatch = 0] = parse(current);
  const [rMajor = 0, rMinor = 0, rPatch = 0] = parse(required);
  if (cMajor !== rMajor) return cMajor > rMajor;
  if (cMinor !== rMinor) return cMinor > rMinor;
  return cPatch >= rPatch;
}

export class SkillInjector {
  /**
   * 批量注入核心技能到 NanoClaw 容器（带互斥锁）
   */
  async injectCoreSkills(
    containerId: string,
    nanoclawEndpoint: string,
    authToken: string,
    skillIds?: string[]
  ): Promise<SkillInjectionResult> {
    return withContainerMutex(containerId, async () => {
      const skills = skillIds
        ? skillIds.map(id => CORE_SKILL_MAP[id]).filter(Boolean)
        : CORE_SKILL_PROMPTS;

      const injected: string[] = [];
      const failed: Array<{ skillId: string; error: string }> = [];

      for (const skill of skills) {
        try {
          await this.injectSingleSkill(containerId, skill, nanoclawEndpoint, authToken);
          injected.push(skill.id);
        } catch (err) {
          failed.push({
            skillId: skill.id,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      // Sync state after injection
      let state: SkillState | undefined;
      if (injected.length > 0) {
        try {
          state = await this.syncSkillState(containerId, nanoclawEndpoint, authToken);
        } catch { /* best effort */ }
      }

      return { success: failed.length === 0, injected, failed, state };
    });
  }

  /**
   * 注入单个技能到容器
   */
  private async injectSingleSkill(
    containerId: string,
    skill: CoreSkillPrompt,
    nanoclawEndpoint: string,
    authToken: string
  ): Promise<void> {
    const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
      body: {
        action: 'deploy_skill',
        containerId,
        skillName: skill.id.replace('nc-', ''),
        skillMd: skill.skillMd,
        nanoclawEndpoint,
        authToken,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  }

  /**
   * 同步容器内的 state.yaml 到前端
   */
  async syncSkillState(
    containerId: string,
    nanoclawEndpoint: string,
    authToken: string
  ): Promise<SkillState> {
    const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
      body: {
        action: 'read_file',
        containerId,
        filePath: '.nanoclaw/state.yaml',
        nanoclawEndpoint,
        authToken,
      },
    });

    if (error) throw error;
    return data?.content as SkillState;
  }

  /**
   * 完整预检 — 检查依赖、冲突、版本兼容性
   */
  async preflightCheck(
    containerId: string,
    skillIds: string[],
    nanoclawEndpoint: string,
    authToken: string
  ): Promise<{
    ok: boolean;
    issues: Array<{ skillId: string; issue: string }>;
  }> {
    const issues: Array<{ skillId: string; issue: string }> = [];

    // Get current state
    let currentState: SkillState | null = null;
    try {
      currentState = await this.syncSkillState(containerId, nanoclawEndpoint, authToken);
    } catch {
      // No state yet — fresh container, all skills can be applied
      return { ok: true, issues: [] };
    }

    const appliedNames = new Set(currentState.applied_skills.map(s => s.name));

    for (const id of skillIds) {
      const skill = CORE_SKILL_MAP[id];
      if (!skill) {
        issues.push({ skillId: id, issue: `Unknown skill: ${id}` });
        continue;
      }

      const cleanName = skill.id.replace('nc-', '');

      // 1. Already-installed check
      if (appliedNames.has(cleanName)) {
        issues.push({ skillId: id, issue: `Already installed: ${cleanName}` });
        continue;
      }

      // 2. System version check (min_system_version)
      if (skill.minSystemVersion) {
        if (!semverSatisfies(currentState.skills_system_version, skill.minSystemVersion)) {
          issues.push({
            skillId: id,
            issue: `Requires system version >= ${skill.minSystemVersion}, current: ${currentState.skills_system_version}`,
          });
        }
      }

      // 3. Core version check (min_core_version)
      if (skill.minCoreVersion) {
        if (!semverSatisfies(currentState.core_version, skill.minCoreVersion)) {
          issues.push({
            skillId: id,
            issue: `Requires core version >= ${skill.minCoreVersion}, current: ${currentState.core_version}`,
          });
        }
      }

      // 4. Dependency check (depends_on)
      if (skill.dependsOn && skill.dependsOn.length > 0) {
        const missingDeps = skill.dependsOn.filter(dep => !appliedNames.has(dep));
        if (missingDeps.length > 0) {
          issues.push({
            skillId: id,
            issue: `Missing dependencies: ${missingDeps.join(', ')}`,
          });
        }
      }

      // 5. Conflict check (conflicts_with)
      if (skill.conflictsWith && skill.conflictsWith.length > 0) {
        const conflicts = skill.conflictsWith.filter(c => appliedNames.has(c));
        if (conflicts.length > 0) {
          issues.push({
            skillId: id,
            issue: `Conflicts with installed skills: ${conflicts.join(', ')}`,
          });
        }
      }
    }

    return { ok: issues.length === 0, issues };
  }

  /**
   * 列出所有可用的核心技能
   */
  listAvailableSkills(): CoreSkillPrompt[] {
    return [...CORE_SKILL_PROMPTS];
  }

  /**
   * 按类别列出核心技能
   */
  listByCategory(category: string): CoreSkillPrompt[] {
    return CORE_SKILL_PROMPTS.filter(s => s.category === category);
  }

  /**
   * 按难度筛选核心技能
   */
  listByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): CoreSkillPrompt[] {
    return CORE_SKILL_PROMPTS.filter(s => s.difficulty === difficulty);
  }

  /**
   * 列出所有可用的技能类别
   */
  listCategories(): string[] {
    return [...new Set(CORE_SKILL_PROMPTS.map(s => s.category))];
  }
}

export const skillInjector = new SkillInjector();

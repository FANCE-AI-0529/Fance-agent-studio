/**
 * Skill Crafter Engine - Autonomous skill generation pipeline
 * Generates NanoClaw skills from natural language, applies them to containers,
 * and validates via testing — all without human intervention.
 */

import { supabase } from '../integrations/supabase/client.ts';

export interface SkillPackage {
  skillName: string;
  skillMd: string;
  handlerPy: string;
  configYaml: string;
  testCode?: string;
}

export type CraftingPhase = 'idle' | 'generating' | 'writing' | 'applying' | 'testing' | 'rolling_back' | 'complete' | 'error';

export interface CraftingProgress {
  phase: CraftingPhase;
  message: string;
  skill?: SkillPackage;
  error?: string;
  logs: string[];
}

export interface SkillCrafterOptions {
  nanoclawEndpoint: string;
  authToken: string;
  containerId: string;
  onProgress?: (progress: CraftingProgress) => void;
}

/**
 * Generate a NanoClaw skill from natural language via AI
 */
async function generateSkill(request: string, context?: string): Promise<SkillPackage> {
  const { data, error } = await supabase.functions.invoke('skill-crafter', {
    body: { request, context },
  });

  if (error) throw new Error(`Skill generation failed: ${error.message}`);
  if (!data?.success) throw new Error(data?.error || 'Unknown generation error');
  
  return data.skill;
}

/**
 * Write skill files to container via nanoclaw-gateway
 */
async function writeSkillToContainer(
  skill: SkillPackage,
  options: { nanoclawEndpoint: string; authToken: string; containerId: string }
): Promise<string[]> {
  const skillDir = `.nanoclaw/skills/${skill.skillName}`;
  const writtenPaths: string[] = [];
  
  const files = [
    { path: `${skillDir}/SKILL.md`, content: skill.skillMd },
    { path: `${skillDir}/handler.py`, content: skill.handlerPy },
    { path: `${skillDir}/config.yaml`, content: skill.configYaml },
  ];
  
  if (skill.testCode) {
    files.push({ path: `${skillDir}/test.py`, content: skill.testCode });
  }

  for (const file of files) {
    const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
      body: {
        action: 'write_file',
        nanoclawEndpoint: options.nanoclawEndpoint,
        authToken: options.authToken,
        containerId: options.containerId,
        filePath: file.path,
        content: file.content,
      },
    });
    
    if (error) {
      // Partial write — attempt to clean up already-written files
      await cleanupFiles(writtenPaths, options).catch(() => {});
      throw new Error(`Failed to write ${file.path}: ${error.message}`);
    }
    writtenPaths.push(file.path);
  }

  return writtenPaths;
}

/**
 * Clean up files from container (best-effort)
 */
async function cleanupFiles(
  filePaths: string[],
  options: { nanoclawEndpoint: string; authToken: string; containerId: string }
): Promise<void> {
  for (const filePath of filePaths) {
    try {
      await supabase.functions.invoke('nanoclaw-gateway', {
        body: {
          action: 'delete_file',
          nanoclawEndpoint: options.nanoclawEndpoint,
          authToken: options.authToken,
          containerId: options.containerId,
          filePath,
        },
      });
    } catch {
      // best effort — log but continue cleanup
      console.warn(`[skillCrafter] Cleanup failed for: ${filePath}`);
    }
  }
}

/**
 * Apply skill in container via nanoclaw-gateway
 */
async function applySkillInContainer(
  skillName: string,
  options: { nanoclawEndpoint: string; authToken: string; containerId: string }
): Promise<{ success: boolean; output: string }> {
  const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
    body: {
      action: 'apply_skill',
      nanoclawEndpoint: options.nanoclawEndpoint,
      authToken: options.authToken,
      containerId: options.containerId,
      skillDir: `.nanoclaw/skills/${skillName}`,
    },
  });

  if (error) throw new Error(`Skill apply failed: ${error.message}`);
  return { success: !!data?.success, output: data?.output || '' };
}

/**
 * Full autonomous crafting pipeline with rollback on failure
 */
export async function craftSkill(
  request: string,
  options: SkillCrafterOptions,
  context?: string,
): Promise<SkillPackage> {
  const { onProgress } = options;
  const logs: string[] = [];
  
  const emit = (phase: CraftingPhase, message: string, extra?: Partial<CraftingProgress>) => {
    logs.push(`[${phase}] ${message}`);
    onProgress?.({ phase, message, logs: [...logs], ...extra });
  };

  let writtenFiles: string[] = [];
  let skillApplied = false;
  let skill: SkillPackage | undefined;

  try {
    // Phase 1: Generate skill via AI
    emit('generating', '正在通过 AI 生成技能定义...');
    skill = await generateSkill(request, context);
    emit('generating', `技能 "${skill.skillName}" 生成完成`, { skill });

    // Phase 2: Write to container
    emit('writing', `正在将技能文件写入容器...`);
    writtenFiles = await writeSkillToContainer(skill, options);
    emit('writing', '技能文件写入成功');

    // Phase 3: Apply skill
    emit('applying', '正在应用技能到容器...');
    const applyResult = await applySkillInContainer(skill.skillName, options);
    if (!applyResult.success) {
      throw new Error(`Apply failed: ${applyResult.output}`);
    }
    skillApplied = true;
    emit('applying', '技能应用成功');

    // Phase 4: Test (if test code exists)
    if (skill.testCode) {
      emit('testing', '正在运行测试验证...');
      const { data: testResult } = await supabase.functions.invoke('nanoclaw-gateway', {
        body: {
          action: 'execute',
          nanoclawEndpoint: options.nanoclawEndpoint,
          authToken: options.authToken,
          request: {
            containerId: options.containerId,
            command: `cd .nanoclaw/skills/${skill.skillName} && python test.py`,
          },
        },
      });
      const testPassed = testResult?.exitCode === 0;
      if (!testPassed) {
        // Test failed — rollback
        const exitCode = testResult?.exitCode;
        const testOutput = testResult?.output || '';
        throw new Error(`Test failed (exit: ${exitCode}): ${testOutput}`.slice(0, 500));
      }
      emit('testing', '测试通过 ✓');
    }

    emit('complete', `技能 "${skill.skillName}" 锻造完成！`, { skill });
    return skill;

  } catch (error: any) {
    // ── Rollback on any failure after files were written ──
    if (writtenFiles.length > 0 || skillApplied) {
      emit('rolling_back', '正在回滚已写入的文件...');
      await cleanupFiles(writtenFiles, options).catch(() => {});
      emit('rolling_back', '回滚完成');
    }

    emit('error', error.message || '锻造失败', { error: error.message });
    throw error;
  }
}

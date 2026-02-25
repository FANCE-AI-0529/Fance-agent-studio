/**
 * NanoClaw 技能系统类型定义
 * 从上传的 NanoClaw 基础设施代码中提取
 */

// ── 技能清单（manifest.yaml）──
export interface NanoClawSkillManifest {
  skill: string;
  version: string;
  description?: string;
  adds: string[];
  modifies: string[];
  file_ops?: FileOperation[];
  structured?: StructuredOps;
  post_apply?: string[];
  test?: string;
  depends_on?: string[];
  conflicts_with?: string[];
  min_system_version?: string;
  min_core_version?: string;
}

export interface FileOperation {
  type: 'rename' | 'delete' | 'copy' | 'move';
  from?: string;
  to?: string;
  path?: string;
}

export interface StructuredOps {
  npm_dependencies?: Record<string, string>;
  env_additions?: Record<string, string>;
  docker_compose_services?: Record<string, unknown>;
}

// ── 技能状态（state.yaml）──
export interface SkillState {
  skills_system_version: string;
  core_version: string;
  applied_skills: AppliedSkill[];
  custom_modifications?: CustomModification[];
}

export interface AppliedSkill {
  name: string;
  version: string;
  applied_at: string;
  file_hashes: Record<string, string>;
  structured_outcomes?: Record<string, unknown>;
}

export interface CustomModification {
  name: string;
  description?: string;
  files_changed: string[];
  applied_at: string;
}

// ── 应用结果 ──
export interface ApplyResult {
  success: boolean;
  skill: string;
  version: string;
  error?: string;
  mergeConflicts?: string[];
  backupPending?: boolean;
  untrackedChanges?: string[];
}

// ── NanoClaw 原生 SKILL.md 前置元数据 ──
export interface NativeSkillFrontmatter {
  name: string;
  description: string;
  'allowed-tools': string;
}

// ── 技能注入请求 ──
export interface SkillInjectionRequest {
  containerId: string;
  skillIds: string[];
  nanoclawEndpoint: string;
  authToken: string;
}

export interface SkillInjectionResult {
  success: boolean;
  injected: string[];
  failed: Array<{ skillId: string; error: string }>;
  state?: SkillState;
}

// ── 常量（与 NanoClaw constants.ts 对齐）──
export const NANOCLAW_PATHS = {
  DIR: '.nanoclaw',
  STATE_FILE: 'state.yaml',
  BASE_DIR: '.nanoclaw/base',
  BACKUP_DIR: '.nanoclaw/backup',
  LOCK_FILE: '.nanoclaw/lock',
  CUSTOM_DIR: '.nanoclaw/custom',
  SKILLS_DIR: '.claude/skills',
  SCHEMA_VERSION: '0.1.0',
} as const;

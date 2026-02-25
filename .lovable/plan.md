

# 核心自主能力 Skills 提示词库扩充计划

## 背景分析

当前系统中 `src/components/foundry/SkillTemplates.tsx` 包含约 25 个技能模板，均采用 Agent OS Studio 格式（`permissions` / `inputs` / `outputs` frontmatter）。用户上传的 `SKILL-10.md`（agent-browser）展示了 NanoClaw 原生格式：使用 `allowed-tools: Bash(agent-browser:*)` 声明工具权限，以 Markdown 文档作为 Agent 的行为协议。

上传的 NanoClaw 技能基础设施代码（`apply.ts`、`backup.ts`、`customize.ts`、`lock.ts` 等）揭示了完整的技能生命周期：安装 → 三路合并 → 备份回滚 → 自定义补丁 → 版本管理。

**目标**：构建一套 NanoClaw 原生格式的核心自主能力 SKILL.md 提示词库，使容器内 Agent 具备"全自动驾驶"能力——无需人工干预即可浏览网页、操作文件、管理记忆、执行代码、规划任务、自我修复。

---

## 实施方案

### 1. 创建核心技能提示词常量库

**新建** `src/constants/coreSkillPrompts.ts`

定义 8 个 NanoClaw 原生格式的核心自主能力 SKILL.md：

| 技能 ID | 名称 | allowed-tools | 用途 |
|---------|------|---------------|------|
| `agent-browser` | 浏览器自动化 | `Bash(agent-browser:*)` | 网页浏览、数据抓取、表单填写、截图 |
| `file-manager` | 文件系统管理 | `Bash(find,ls,cat,mkdir,cp,mv,rm,touch,head,tail,wc,grep)` | 目录遍历、文件读写、搜索、批量操作 |
| `shell-executor` | Shell 命令执行 | `Bash(*)` | 通用命令行操作，受 MPLP 安全拦截 |
| `memory-manager` | 长期记忆管理 | `Bash(cat,echo,sed)`, `Read`, `Write` | CLAUDE.md 读写、task_plan.md、progress.md 维护 |
| `task-planner` | 任务规划引擎 | `Read`, `Write`, `Bash(date)` | 任务分解、进度追踪、自唤醒调度 |
| `code-reviewer` | 代码审查与重构 | `Read`, `Bash(grep,diff,wc)` | 代码质量分析、重构建议、PR 审查 |
| `api-connector` | HTTP/API 连接器 | `Bash(curl,jq)` | RESTful API 调用、响应解析、链式请求 |
| `self-healer` | 自我修复引擎 | `Bash(*)`, `Read`, `Write` | 错误检测、日志分析、自动修复、回滚 |

每个 SKILL.md 遵循上传的 `agent-browser` 格式规范：
- YAML frontmatter：`name`、`description`、`allowed-tools`
- Markdown body：Quick start → Core workflow → Commands → Examples
- 全部为可直接注入 `.claude/skills/` 目录的生产级提示词

### 2. 创建技能基础设施类型

**新建** `src/types/nanoclawSkills.ts`

从上传的 NanoClaw 代码中提取关键类型，使前端能理解技能生命周期：

```typescript
interface NanoClawSkillManifest {
  skill: string;
  version: string;
  adds: string[];
  modifies: string[];
  file_ops?: FileOperation[];
  structured?: StructuredOps;
  post_apply?: string[];
  test?: string;
}

interface SkillState {
  skills_system_version: string;
  core_version: string;
  applied_skills: AppliedSkill[];
  custom_modifications?: CustomModification[];
}

interface AppliedSkill {
  name: string;
  version: string;
  applied_at: string;
  file_hashes: Record<string, string>;
}
```

### 3. 扩展技能模板库

**修改** `src/components/foundry/SkillTemplates.tsx`

- 新增"核心自主能力"分类（category: `"核心自主"`）
- 导入 `coreSkillPrompts.ts` 中的 8 个技能
- 每个技能包含 NanoClaw 原生 SKILL.md content + 对应的 handler.py + config.yaml
- 在模板选择器 UI 中增加"NanoClaw 原生"标签徽章

### 4. 更新技能生成器

**修改** `src/services/skillGenerator.ts`

- `SkillMdStructure` 接口新增 `allowedTools: string[]` 字段
- `parseSkillMd()` 支持解析 `allowed-tools` frontmatter
- `generateSkillMd()` 支持输出 NanoClaw 原生格式
- 新增 `generateNativeSkillMd()` 方法，专门生成 NanoClaw 原生 SKILL.md

### 5. 更新 Edge Function 提示词

**修改** `supabase/functions/generate-skill-template/index.ts`

- system prompt 中新增 NanoClaw 原生格式说明
- 当请求参数包含 `format: 'nanoclaw_native'` 时，使用 `allowed-tools` 格式
- tool calling schema 新增 `allowedTools` 字段

### 6. 创建技能注入服务

**新建** `src/services/skillInjector.ts`

- `injectCoreSkills()`: 批量注入核心技能到 NanoClaw 容器的 `.claude/skills/` 目录
- `syncSkillState()`: 同步容器内的 `state.yaml` 到前端
- `preflightCheck()`: 检查依赖和冲突（复用上传的 manifest 检查逻辑）
- 通过 `nanoclaw-gateway` Edge Function 代理执行

---

## 文件变更清单

### 新建文件 (3 个)

| 文件 | 说明 |
|------|------|
| `src/constants/coreSkillPrompts.ts` | 8 个 NanoClaw 原生格式核心自主能力 SKILL.md |
| `src/types/nanoclawSkills.ts` | NanoClaw 技能系统类型定义 |
| `src/services/skillInjector.ts` | 技能注入与生命周期管理服务 |

### 修改文件 (3 个)

| 文件 | 变更 |
|------|------|
| `src/components/foundry/SkillTemplates.tsx` | 新增"核心自主能力"分类，导入 8 个原生技能模板 |
| `src/services/skillGenerator.ts` | 支持 NanoClaw 原生 SKILL.md 格式解析与生成 |
| `supabase/functions/generate-skill-template/index.ts` | system prompt 新增原生格式，tool schema 扩展 |




# 核心自主能力 Skills 提示词库扩充 — 第二批

## 背景

当前已有 8 个核心自主能力技能（agent-browser、file-manager、shell-executor、memory-manager、task-planner、code-reviewer、api-connector、self-healer）。用户上传了 NanoClaw 技能基础设施的完整生命周期代码（migrate、rebase、replay、uninstall、update、path-remap、structured、state、types），揭示了更深层的容器管理能力。

需要基于这些新上传的基础设施代码，扩充第二批核心技能，覆盖技能生命周期管理、版本控制、环境配置、数据管道等高级自主能力。

---

## 新增 8 个核心自主技能

| 技能 ID | 名称 | allowed-tools | 用途 |
|---------|------|---------------|------|
| `skill-lifecycle` | 技能生命周期管理 | `Bash(*), Read, Write` | 技能安装/卸载/更新/回滚，基于上传的 apply/uninstall/update 逻辑 |
| `git-operator` | Git 版本控制 | `Bash(git,diff,patch)` | 代码提交、分支管理、PR 创建、冲突解决 |
| `env-configurator` | 环境配置管理 | `Bash(cat,echo,sed,grep), Read, Write` | .env 管理、npm 依赖、Docker Compose 服务配置（对应 structured.ts） |
| `data-pipeline` | 数据管道处理 | `Bash(cat,sort,uniq,awk,sed,cut,paste,tr,jq), Read` | CSV/JSON/日志数据的 ETL 处理、统计分析 |
| `test-runner` | 测试执行引擎 | `Bash(*), Read` | 自动运行测试套件、解析结果、生成覆盖率报告 |
| `doc-generator` | 文档生成器 | `Read, Write, Bash(grep,wc)` | 从代码生成 API 文档、README、变更日志 |
| `container-monitor` | 容器监控 | `Bash(ps,top,df,free,netstat,lsof)` | 实时资源监控、性能分析、瓶颈检测 |
| `secret-manager` | 密钥安全管理 | `Bash(grep,sed), Read, Write` | .env 密钥轮换、敏感信息检测、安全审计 |

---

## 实施方案

### 1. 扩展核心技能提示词常量库

**修改** `src/constants/coreSkillPrompts.ts`

- 新增上述 8 个 NanoClaw 原生格式 SKILL.md 定义
- 每个技能包含完整的 skillMd（Quick start → Core workflow → Commands → Examples）、handlerPy、configYaml
- 将 `CORE_SKILL_PROMPTS` 导出数组从 8 个扩展到 16 个

### 2. 扩展类型定义

**修改** `src/types/nanoclawSkills.ts`

- 从上传的 `types.ts` 中补充缺失的类型：`UninstallResult`、`UpdatePreview`、`UpdateResult`、`RebaseResult`、`ReplayResult`、`MergeResult`、`FileOpsResult`
- 新增 `SkillLifecycleAction` 联合类型（install | uninstall | update | rebase | replay）

### 3. 更新技能模板 UI

**修改** `src/components/foundry/SkillTemplates.tsx`

- 为新增 8 个技能添加图标映射（GitBranch、Settings、Database、TestTube、FileText、Activity、KeyRound、Container）
- 新增"高级自主"子分类标签，区分基础 8 技能和进阶 8 技能

### 4. 更新注入服务

**修改** `src/services/skillInjector.ts`

- `listByCategory` 支持新的分类
- 新增 `listByDifficulty(difficulty)` 方法，按难度筛选

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/constants/coreSkillPrompts.ts` | 修改 | 新增 8 个核心技能定义，总计 16 个 |
| `src/types/nanoclawSkills.ts` | 修改 | 补充生命周期操作结果类型 |
| `src/components/foundry/SkillTemplates.tsx` | 修改 | 新增图标映射和分类标签 |
| `src/services/skillInjector.ts` | 修改 | 新增按难度筛选方法 |




# Plan: README Logo + 全站 "Agent Studio" → "Fance Studio" 品牌统一

## 1. 添加 Logo 图片

- 将用户上传的图片复制到 `public/logo.png`
- 更新 README.md 中的 `<img src>` 指向 `public/logo.png`，`width="180"`

## 2. README.md 品牌重写

将所有 "Agent Studio" 替换为 "Fance Studio"：
- 标题、项目简介、技术栈描述、git clone URL、Footer
- alt 文本、锚点链接等

## 3. 全站代码中 "Agent Studio" → "Fance Studio" 统一

涉及文件（16 个匹配文件）：

| 文件 | 修改内容 |
|------|----------|
| `LICENSE` | `Copyright (c) 2025 Agent Studio` → `Fance Studio` |
| `CONTRIBUTING.md` | 标题和 GitHub URL |
| `CHANGELOG.md` | "Agent Studio 正式开源" 等文案 |
| `docs/WORKFLOW_NODES.md` | 文档标题和描述 |
| `index.html` | `twitter:site` 中的 `@AgentStudio` → `@FanceStudio` |
| `src/stores/appModeStore.ts` | persist key `agent-studio-mode` → `fance-studio-mode` |
| `src/components/help/HelpDialog.tsx` | GitHub URL `agent-studio/agent-studio` → `fance-studio/fance-studio` |
| `src/components/settings/ThemeEditor.tsx` | 下载文件名 `agent-studio-theme.json` → `fance-studio-theme.json` |
| `src/components/runtime/WelcomeGuide.tsx` | "Agent Studio 助手"、"欢迎来到 Agent Studio" 等 |
| `src/components/runtime/AgentSelector.tsx` | "Agent Studio 助手" |
| `src/components/foundry/utils/skillFormat.ts` | 默认 author |
| `src/components/foundry/SkillTemplates.tsx` | 模板中的 author 字段 |
| `src/pages/Auth.tsx` | alt="Agent Studio" |
| `supabase/functions/_shared/*.ts` (3 files) | `@author` 和 `@copyright` 注释 |
| `supabase/functions/generate-skill-template/index.ts` | 默认 author 和示例 |

## 4. 实施顺序

1. 复制 Logo 到 `public/logo.png`
2. 重写 README.md（Logo + 全部品牌名称）
3. 批量更新上述所有源文件中的品牌引用
4. 更新 LICENSE、CONTRIBUTING.md、CHANGELOG.md、docs/

所有修改仅涉及字符串替换和静态资源，零功能影响。


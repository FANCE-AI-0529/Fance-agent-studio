
# Agent Studio 开源准备计划

## 一、项目概述

将 Agent Studio 项目准备为开源发布，需要完成以下核心任务：
1. 抹除 Lovable AI 平台特定引用
2. 重写 README 文档
3. 规范化项目结构
4. 添加开源必需文件

---

## 二、Lovable 引用清理清单

### 2.1 配置文件清理

| 文件 | 修改内容 |
|------|----------|
| `package.json` | 移除 `lovable-tagger` 依赖，更新项目名称为 `agent-studio` |
| `vite.config.ts` | 移除 `componentTagger` 导入和使用 |
| `index.html` | 更新 og:image 和 twitter:image URL |
| `src/tailwind.config.lov.json` | 删除此文件（Lovable 专用配置） |

### 2.2 边缘函数清理（43个文件）

需要重构 AI 调用方式，将 `LOVABLE_API_KEY` 和 `ai.gateway.lovable.dev` 替换为通用配置：

| 文件 | 修改内容 |
|------|----------|
| `supabase/functions/_shared/llm-client.ts` | 重构为通用 AI Gateway 客户端，移除 Lovable 特定引用 |
| `supabase/functions/_shared/embed-with-gateway.ts` | 重构嵌入 API 调用 |
| `supabase/functions/agent-api/index.ts` | 使用通用 AI 配置 |
| `supabase/functions/embed-text/index.ts` | 使用通用嵌入配置 |
| `supabase/functions/entity-extraction/index.ts` | 使用通用 AI 配置 |
| `supabase/functions/memory-consolidation/index.ts` | 使用通用 AI 配置 |
| `supabase/functions/rag-ingest/index.ts` | 使用通用嵌入配置 |
| `supabase/functions/kb-auto-profile/index.ts` | 使用通用 AI 配置 |
| `supabase/functions/sync-asset-index/index.ts` | 使用通用 AI 配置 |
| 其他相关函数 | 统一使用 `AI_API_KEY` 和 `AI_GATEWAY_URL` 环境变量 |

### 2.3 前端代码清理

| 文件 | 修改内容 |
|------|----------|
| `src/types/networkPolicy.ts` | 移除 `network:lovable` 配置项 |
| `src/components/settings/GlobalModelSettings.tsx` | 移除 Lovable AI 作为默认选项的引用 |
| `src/components/help/HelpDialog.tsx` | 更新文档链接 |

---

## 三、README 文档重写

### 3.1 新 README 结构

```text
README.md
├── 项目简介与 Logo
├── 功能特性
│   ├── 智能体构建器 (Builder)
│   ├── 技能工坊 (Foundry)
│   ├── 知识库管理 (Knowledge)
│   └── 运行时对话 (Runtime)
├── 技术栈
├── 快速开始
│   ├── 环境要求
│   ├── 安装步骤
│   ├── 环境变量配置
│   └── 开发命令
├── 项目结构
├── 核心模块说明
├── 边缘函数部署
├── 贡献指南
├── 许可证
└── 致谢
```

---

## 四、项目结构规范化

### 4.1 新增开源必需文件

| 文件 | 用途 |
|------|------|
| `LICENSE` | MIT 许可证 |
| `CONTRIBUTING.md` | 贡献指南 |
| `CODE_OF_CONDUCT.md` | 行为准则 |
| `CHANGELOG.md` | 版本更新日志 |
| `.env.example` | 环境变量模板 |
| `.github/ISSUE_TEMPLATE/` | Issue 模板 |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR 模板 |

### 4.2 移动/删除文件

| 操作 | 文件 | 说明 |
|------|------|------|
| 删除 | `.lovable/` | Lovable 平台专用目录 |
| 删除 | `src/tailwind.config.lov.json` | Lovable 专用配置 |
| 更新 | `.gitignore` | 添加通用忽略项 |

### 4.3 文档目录重组

```text
docs/
├── README.md (文档索引)
├── architecture/
│   ├── overview.md
│   ├── database-schema.md
│   └── edge-functions.md
├── guides/
│   ├── getting-started.md
│   ├── deployment.md
│   └── customization.md
├── api/
│   ├── WORKFLOW_API.md (已有)
│   └── WORKFLOW_NODES.md (已有)
└── development/
    ├── contributing.md
    └── testing.md
```

---

## 五、环境变量标准化

### 5.1 新环境变量模板 (.env.example)

```text
# ============================================
# Agent Studio 环境变量配置
# ============================================

# --- 数据库 (Supabase) ---
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id

# --- AI 服务配置 ---
# 支持 OpenAI、Anthropic、Google AI 等
AI_GATEWAY_URL=https://api.openai.com/v1
AI_API_KEY=your_ai_api_key
AI_EMBEDDING_URL=https://api.openai.com/v1/embeddings
AI_EMBEDDING_KEY=your_embedding_api_key

# --- 可选服务 ---
STRIPE_SECRET_KEY=your_stripe_key (可选，用于支付功能)
```

---

## 六、技术实现细节

### 6.1 AI 客户端重构

将 `_shared/llm-client.ts` 重构为：

```typescript
/**
 * 通用 AI Gateway 配置
 */
const AI_GATEWAY_URL = Deno.env.get('AI_GATEWAY_URL') || 'https://api.openai.com/v1/chat/completions';
const AI_API_KEY = Deno.env.get('AI_API_KEY');

/**
 * 调用 AI 模型
 */
export async function callAI(options: AIRequestOptions): Promise<AIResponse> {
  // 使用通用配置调用 AI
}
```

### 6.2 嵌入服务重构

将 `_shared/embed-with-gateway.ts` 重构为：

```typescript
const EMBEDDING_ENDPOINT = Deno.env.get('AI_EMBEDDING_URL') || 'https://api.openai.com/v1/embeddings';
const EMBEDDING_KEY = Deno.env.get('AI_EMBEDDING_KEY') || Deno.env.get('AI_API_KEY');
```

---

## 七、执行步骤

### 阶段一：配置文件清理（约 1 小时）

1. 更新 `package.json` - 移除 lovable-tagger，更新项目名
2. 更新 `vite.config.ts` - 移除 componentTagger
3. 更新 `index.html` - 移除 Lovable OG 图片引用
4. 删除 `src/tailwind.config.lov.json`
5. 删除 `.lovable/` 目录

### 阶段二：边缘函数重构（约 3-4 小时）

1. 重构 `_shared/llm-client.ts` 为通用 AI 客户端
2. 重构 `_shared/embed-with-gateway.ts` 为通用嵌入客户端
3. 更新所有引用 Lovable API 的边缘函数（约 15 个文件）
4. 创建 `_shared/config.ts` 统一管理环境变量

### 阶段三：前端代码清理（约 1 小时）

1. 更新 `src/types/networkPolicy.ts`
2. 更新 `src/components/settings/GlobalModelSettings.tsx`
3. 更新 `src/components/help/HelpDialog.tsx` 中的文档链接

### 阶段四：文档编写（约 2 小时）

1. 重写 `README.md`
2. 创建 `.env.example`
3. 创建 `LICENSE` (MIT)
4. 创建 `CONTRIBUTING.md`
5. 创建 `CHANGELOG.md`

### 阶段五：GitHub 模板（约 30 分钟）

1. 创建 `.github/ISSUE_TEMPLATE/bug_report.md`
2. 创建 `.github/ISSUE_TEMPLATE/feature_request.md`
3. 创建 `.github/PULL_REQUEST_TEMPLATE.md`

---

## 八、预估工作量

| 阶段 | 工作内容 | 预估时间 |
|------|----------|----------|
| 阶段一 | 配置文件清理 | 1 小时 |
| 阶段二 | 边缘函数重构 | 3-4 小时 |
| 阶段三 | 前端代码清理 | 1 小时 |
| 阶段四 | 文档编写 | 2 小时 |
| 阶段五 | GitHub 模板 | 30 分钟 |
| **合计** | | **7.5-8.5 小时** |

---

## 九、注意事项

1. **API 兼容性**：重构后的 AI 客户端需要兼容 OpenAI API 格式，因为大多数 AI 提供商都支持这种格式
2. **环境变量文档**：确保 `.env.example` 中有清晰的注释说明每个变量的用途
3. **测试验证**：重构完成后需要测试核心功能是否正常工作
4. **敏感信息检查**：确保没有泄露任何 API 密钥或敏感配置


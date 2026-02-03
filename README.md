<div align="center">
  <img src="public/logo.svg" alt="Agent Studio Logo" width="120" />
  <h1>Agent Studio</h1>
  <p><strong>技能驱动，智能无限</strong> — 企业级智能体构建平台</p>
  
  <p>
    <a href="#功能特性">功能特性</a> •
    <a href="#快速开始">快速开始</a> •
    <a href="#项目结构">项目结构</a> •
    <a href="#部署指南">部署指南</a> •
    <a href="#贡献指南">贡献指南</a>
  </p>
  
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
    <img src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" alt="TypeScript" />
    <img src="https://img.shields.io/badge/React-18.3+-61dafb.svg" alt="React" />
  </p>
</div>

---

## 📖 项目简介

Agent Studio 是一个基于 **双引擎架构** 的企业级智能体操作系统：

- **认知引擎 (Cognitive Engine)**：基于 Skill 技能系统，让智能体具备可组合、可扩展的能力
- **治理引擎 (Governance Engine)**：基于 MPLP (多智能体生命周期协议)，确保敏感操作的安全审计

平台采用工程优先、可观测性优先的设计理念，提供完整的智能体开发、测试、部署全生命周期管理。

## ✨ 功能特性

### 🔨 智能体构建器 (Builder)

- **可视化画布编辑**：拖拽式节点编排，支持 DAG 工作流设计
- **系统提示词编辑器**：Monaco 代码编辑器，支持变量插值和语法高亮
- **版本快照管理**：Git 风格的版本控制，支持回滚和对比
- **实时协作编辑**：多人实时协作，光标同步和团队聊天

### 🛠 技能工坊 (Foundry)

- **技能市场**：发现、安装和分享社区技能
- **能力包系统**：批量安装相关技能，一键扩展智能体能力
- **技能开发 SDK**：标准化的技能定义规范 (SKILL.md)
- **MCP 工具集成**：支持 Model Context Protocol 工具挂载

### 📚 知识库管理 (Knowledge)

- **RAG 检索增强**：向量化文档，智能检索相关上下文
- **多格式支持**：PDF、Markdown、文本等多种文档格式
- **自动切片索引**：智能文档分割，优化检索效果
- **知识图谱**：实体抽取和关系建模

### 💬 运行时对话 (Runtime)

- **流式响应**：实时打字效果，Token 级别的流式输出
- **多模态支持**：图片理解和分析
- **消息引用回复**：引用历史消息进行上下文对话
- **AI 表情系统**：根据回复情绪动态切换 Avatar

### 🔒 安全与治理

- **MPLP 权限控制**：细粒度的操作权限管理
- **RLS 行级安全**：数据库层面的多租户隔离
- **API 密钥加密**：AES-256 加密存储敏感凭证
- **操作审计日志**：完整的操作历史追踪

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| **前端框架** | React 18 + TypeScript + Vite |
| **UI 组件** | shadcn/ui + Radix UI + Tailwind CSS |
| **状态管理** | Zustand + TanStack Query |
| **可视化** | React Flow + Recharts |
| **后端服务** | Supabase (PostgreSQL + Edge Functions) |
| **AI 集成** | OpenAI API 兼容接口 |

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 bun
- Supabase 账户 (或自托管实例)

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/agent-studio.git
cd agent-studio

# 2. 安装依赖
npm install
# 或
bun install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要的配置

# 4. 启动开发服务器
npm run dev
```

### 环境变量配置

参考 `.env.example` 文件配置以下变量：

```bash
# Supabase 配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# AI 服务配置 (Edge Functions)
AI_API_KEY=your_openai_api_key
AI_GATEWAY_URL=https://api.openai.com/v1/chat/completions
AI_EMBEDDING_URL=https://api.openai.com/v1/embeddings
```

## 📁 项目结构

```
agent-studio/
├── src/
│   ├── components/          # UI 组件
│   │   ├── builder/         # 构建器模块
│   │   ├── foundry/         # 技能工坊模块
│   │   ├── knowledge/       # 知识库模块
│   │   ├── runtime/         # 运行时对话模块
│   │   └── ui/              # 基础 UI 组件
│   ├── hooks/               # 自定义 Hooks
│   ├── pages/               # 页面组件
│   ├── stores/              # Zustand 状态管理
│   ├── types/               # TypeScript 类型定义
│   └── utils/               # 工具函数
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── _shared/         # 共享模块
│   │   ├── agent-chat/      # 对话服务
│   │   ├── llm-gateway/     # LLM 路由网关
│   │   ├── rag-ingest/      # RAG 文档摄入
│   │   └── ...              # 其他函数
│   └── migrations/          # 数据库迁移
├── docs/                    # 项目文档
└── public/                  # 静态资源
```

## 🌐 部署指南

### Vercel 部署

```bash
npm run build
vercel deploy
```

### Supabase Edge Functions

Edge Functions 会在代码推送后自动部署。确保在 Supabase Dashboard 中配置以下 Secrets：

- `AI_API_KEY` - AI 服务 API 密钥
- `AI_GATEWAY_URL` - AI Chat API 端点
- `AI_EMBEDDING_URL` - Embedding API 端点

### 自托管

1. 构建生产版本：`npm run build`
2. 部署 `dist/` 目录到任意静态托管服务
3. 配置 Supabase 项目和 Edge Functions

## 🤝 贡献指南

我们欢迎各种形式的贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

### 贡献流程

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 编写所有代码
- 遵循 ESLint 和 Prettier 配置
- 编写有意义的提交信息 (遵循 Conventional Commits)
- 为新功能添加测试

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 🙏 致谢

- [React](https://react.dev/)
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [React Flow](https://reactflow.dev/)

---

<div align="center">
  <p>Made with ❤️ by Agent Studio Team</p>
</div>

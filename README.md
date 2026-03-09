<div align="center">
  <img src="public/logo.png" alt="Fance Studio Logo" width="180" />
  <h1>Fance Studio</h1>
  <p><strong>Skill-Driven, Intelligence Unlimited</strong> — Enterprise-Grade Agent Building Platform</p>
  
  <p>
    <a href="#-features">Features</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-project-structure">Project Structure</a> •
    <a href="#-deployment-guide">Deployment Guide</a> •
    <a href="#-contributing">Contributing</a>
  </p>
  
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
    <img src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" alt="TypeScript" />
    <img src="https://img.shields.io/badge/React-18.3+-61dafb.svg" alt="React" />
  </p>
</div>

---

## 📖 Project Overview

Fance Studio is an enterprise-grade agent operating system based on a **dual-engine architecture**:

- **Cognitive Engine**: Built on the Skill system, enabling agents with composable, extensible capabilities
- **Governance Engine**: Built on MPLP (Multi-Agent Lifecycle Protocol), ensuring secure auditing of sensitive operations

The platform follows an engineering-first, observability-first design philosophy, providing full lifecycle management for agent development, testing, and deployment.

## ✨ Features

### 🔨 Agent Builder

- **Visual Canvas Editing**: Drag-and-drop node orchestration with DAG workflow design
- **System Prompt Editor**: Monaco code editor with variable interpolation and syntax highlighting
- **Version Snapshot Management**: Git-style version control with rollback and diff support
- **Real-time Collaborative Editing**: Multi-user real-time collaboration with cursor sync and team chat

### 🛠 Skill Foundry

- **Skill Marketplace**: Discover, install, and share community skills
- **Capability Pack System**: Batch install related skills to extend agent capabilities with one click
- **Skill Development SDK**: Standardized skill definition specification (SKILL.md)
- **MCP Tool Integration**: Model Context Protocol tool mounting support

### 📚 Knowledge Base (Knowledge)

- **RAG Retrieval Augmentation**: Vectorized documents with intelligent context retrieval
- **Multi-format Support**: PDF, Markdown, text, and other document formats
- **Auto Chunk Indexing**: Smart document splitting for optimized retrieval
- **Knowledge Graph**: Entity extraction and relationship modeling

### 💬 Runtime Chat (Runtime)

- **Streaming Response**: Real-time typing effect with token-level streaming output
- **Multimodal Support**: Image understanding and analysis
- **Message Quote Reply**: Reference history messages for contextual conversation
- **AI Expression System**: Dynamic Avatar switching based on reply sentiment

### 🔒 Security & Governance

- **MPLP Permission Control**: Fine-grained operation permission management
- **RLS Row-Level Security**: Database-level multi-tenant isolation
- **API Key Encryption**: AES-256 encrypted storage for sensitive credentials
- **Operation Audit Logging**: Complete operation history tracking

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **UI Components** | shadcn/ui + Radix UI + Tailwind CSS |
| **State Management** | Zustand + TanStack Query |
| **Visualization** | React Flow + Recharts |
| **Backend** | Supabase (PostgreSQL + Edge Functions) |
| **AI Integration** | OpenAI API-compatible interface |

## 🚀 Quick Start

### Requirements

- Node.js 18+
- npm or bun
- Supabase account (or self-hosted instance)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/fance-studio/fance-studio.git
cd fance-studio

# 2. Install dependencies
npm install
# or
bun install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in the required configuration

# 4. Start the development server
npm run dev
```

### Environment Variables

Refer to `.env.example` for the following variables:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# AI service (Edge Functions)
AI_API_KEY=your_openai_api_key
AI_GATEWAY_URL=https://api.openai.com/v1/chat/completions
AI_EMBEDDING_URL=https://api.openai.com/v1/embeddings
```

## 📁 Project Structure

```
fance-studio/
├── src/
│   ├── components/          # UI components
│   │   ├── builder/         # Builder module
│   │   ├── foundry/         # Skill Foundry module
│   │   ├── knowledge/       # Knowledge module
│   │   ├── runtime/         # Runtime chat module
│   │   └── ui/              # Base UI components
│   ├── hooks/               # Custom hooks
│   ├── pages/               # Page components
│   ├── stores/              # Zustand state
│   ├── types/               # TypeScript types
│   └── utils/               # Utilities
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── _shared/         # Shared modules
│   │   ├── agent-chat/      # Chat service
│   │   ├── llm-gateway/     # LLM gateway
│   │   ├── rag-ingest/      # RAG ingestion
│   │   └── ...              # Other functions
│   └── migrations/          # Database migrations
├── docs/                    # Documentation
└── public/                  # Static assets
```

## 🌐 Deployment Guide

### Vercel

```bash
npm run build
vercel deploy
```

### Supabase Edge Functions

Edge Functions are deployed automatically on push. Configure these secrets in the Supabase Dashboard:

- `AI_API_KEY` — AI service API key
- `AI_GATEWAY_URL` — AI Chat API endpoint
- `AI_EMBEDDING_URL` — Embedding API endpoint

### Self-Hosted

1. Build for production: `npm run build`
2. Deploy the `dist/` directory to any static host
3. Configure your Supabase project and Edge Functions

## 🤝 Contributing

We welcome all kinds of contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Write all code in TypeScript
- Follow ESLint and Prettier configuration
- Use meaningful commit messages (Conventional Commits)
- Add tests for new features

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [React](https://react.dev/)
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [React Flow](https://reactflow.dev/)

---

<div align="center">
  <p>Made with ❤️ by Fance Studio Team</p>
</div>

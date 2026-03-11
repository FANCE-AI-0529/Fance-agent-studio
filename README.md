<div align="center">
  <img src="public/logo.png" alt="Fance Studio Logo" width="180" />
  <h1>Fance Studio</h1>
  <p><strong>Skill‑driven, intelligence without limits</strong> — an enterprise‑grade agent building platform</p>
  
  <p>
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#project-structure">Project Structure</a> •
    <a href="#deployment-guide">Deployment Guide</a> •
    <a href="#contributing">Contributing</a>
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

Fance Studio is an enterprise‑grade agent operating system built on a **dual‑engine architecture**:

- **Cognitive Engine** – a Skill system that gives agents composable, extensible abilities.
- **Governance Engine** – based on MPLP (Multi‑Agent Lifecycle Protocol) for secure auditing of sensitive operations.

The platform embraces an engineering‑first, observability‑first philosophy and provides full‑lifecycle management for agent development, testing, and deployment.

## ✨ Features

### 🔨 Agent Builder

- **Visual canvas editor** with drag‑and‑drop nodes; supports DAG workflow design.
- **System prompt editor** using the Monaco code editor, with variable interpolation and syntax highlighting.
- **Version snapshot management** with Git‑style versioning, rollback, and diff.
- **Real‑time collaborative editing** including cursor sync and team chat.

### 🛠 Skill Foundry

- **Skill marketplace** to discover, install, and share community skills.
- **Capability packs** for bulk installing related skills and extending agent functionality with one click.
- **Skill development SDK** with a standardized skill specification (`SKILL.md`).
- **MCP tool integration** allowing Model Context Protocol tools to be mounted.

### 📚 Knowledge Management

- **RAG‑powered retrieval**: vectorizes documents for intelligent context lookup.
- **Multi‑format support**: PDF, Markdown, text, etc.
- **Automatic slicing and indexing**: smart document splitting to improve retrieval.
- **Knowledge graph**: entity extraction and relationship modeling.

### 💬 Runtime Conversation

- **Streaming responses** with realtime typing effect and token‑level output.
- **Multimodal support** for image understanding and analysis.
- **Message quoting replies** to reference prior context.
- **AI emoji system** that changes the avatar based on response sentiment.

### 🔒 Security & Governance

- **MPLP permission controls** for fine‑grained operation permissions.
- **RLS row‑level security** for multi‑tenant isolation at the database layer.
- **API key encryption** using AES‑256 to store sensitive credentials.
- **Audit logs** capturing a full history of operations.

## 🛠 Tech Stack

| Category        | Technologies |
|-----------------|--------------|
| **Frontend**    | React 18 + TypeScript + Vite |
| **UI Components** | shadcn/ui + Radix UI + Tailwind CSS |
| **State Management** | Zustand + TanStack Query |
| **Visualization** | React Flow + Recharts |
| **Backend Services** | Supabase (PostgreSQL + Edge Functions) |
| **AI Integration** | OpenAI‑compatible API interface |

## 🚀 Quick Start

### Environment Requirements

- Node.js 18+
- npm or bun
- A Supabase account (or a self‑hosted instance)

### Installation Steps

```bash
# 1. Clone the repo
git clone https://github.com/fance-studio/fance-studio.git
cd fance-studio

# 2. Install dependencies
npm install
# or
bun install

# 3. Configure environment variables
cp .env.example .env
# edit .env and fill in the required values

# 4. Start the development server
npm run dev
```

### Environment Variables

Refer to `.env.example` and set the following:

```bash
# Supabase settings
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# AI service settings (Edge Functions)
AI_API_KEY=your_openai_api_key
AI_GATEWAY_URL=https://api.openai.com/v1/chat/completions
AI_EMBEDDING_URL=https://api.openai.com/v1/embeddings
```

## 📁 Project Structure

```
ance-studio/
├── src/
│   ├── components/          # UI components
│   │   ├── builder/         # builder module
│   │   ├── foundry/         # foundry module
│   │   ├── knowledge/       # knowledge module
│   │   ├── runtime/         # runtime conversation module
│   │   └── ui/              # base UI components
│   ├── hooks/               # custom hooks
│   ├── pages/               # page components
│   ├── stores/              # Zustand state
│   ├── types/               # TypeScript types
│   └── utils/               # utility functions
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── _shared/         # shared modules
│   │   ├── agent-chat/      # conversation service
│   │   ├── llm-gateway/     # LLM routing gateway
│   │   ├── rag-ingest/      # RAG document ingestion
│   │   └── ...              # other functions
│   └── migrations/          # database migrations
├── docs/                    # project documentation
└── public/                  # static assets
```

## 🌐 Deployment Guide

### Vercel Deployment

```bash
npm run build
vercel deploy
```

### Supabase Edge Functions

Edge Functions deploy automatically on code push. Make sure the following Secrets are configured in the Supabase Dashboard:

- `AI_API_KEY` – AI service API key
- `AI_GATEWAY_URL` – AI Chat API endpoint
- `AI_EMBEDDING_URL` – Embedding API endpoint

### Self‑hosting

1. Build production bundle: `npm run build`
2. Deploy the `dist/` directory to any static hosting service
3. Configure your Supabase project and Edge Functions

## 🤝 Contributing

We welcome all kinds of contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Contribution Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Guidelines

- Write all code in TypeScript
- Follow the ESLint and Prettier configuration
- Use meaningful commit messages (Conventional Commits)
- Add tests for new features

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgements

- [React](https://react.dev/)

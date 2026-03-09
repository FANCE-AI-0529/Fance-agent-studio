<div align="center"><img src="public/logo.png" alt="Fance Studio Logo" width="180" /><h1>Fance Studio</h1><p><strong>Skill-Driven, Infinite Intelligence</strong> — Enterprise-Grade AI Agent Construction Platform</p><p><a href="#features">Features</a> •<a href="#quick-start">Quick Start</a> •<a href="#project-structure">Project Structure</a> •<a href="#deployment-guide">Deployment Guide</a> •<a href="#contributing-guide">Contributing Guide</a></p><p><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /><img src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" alt="TypeScript" /><img src="https://img.shields.io/badge/React-18.3+-61dafb.svg" alt="React" /></p></div>📖 Project IntroductionFance Studio is an enterprise-grade AI Agent operating system based on a dual-engine architecture:Cognitive Engine: Powered by a Skill system, enabling agents with composable and extensible capabilities.Governance Engine: Based on MPLP (Multi-agent Lifecycle Protocol), ensuring security auditing for sensitive operations.The platform adopts an engineering-first and observability-first design philosophy, providing full lifecycle management for agent development, testing, and deployment.✨ Features🔨 Agent BuilderVisual Canvas Editing: Drag-and-drop node orchestration, supporting DAG workflow design.System Prompt Editor: Monaco-based code editor with support for variable interpolation and syntax highlighting.Version Snapshot Management: Git-style version control, supporting rollbacks and comparisons.Real-time Collaborative Editing: Multi-user real-time collaboration with cursor synchronization and team chat.🛠 Skill FoundrySkill Market: Discover, install, and share community-driven skills.Capability Packs: Batch install related skills to extend agent capabilities instantly.Skill Development SDK: Standardized skill definition specifications (SKILL.md).MCP Tool Integration: Support for Model Context Protocol tool mounting.📚 Knowledge Base ManagementRAG Enhancement: Vectorized documentation for intelligent retrieval of relevant context.Multi-format Support: Support for PDF, Markdown, TXT, and various other document formats.Automated Chunking & Indexing: Intelligent document segmentation to optimize retrieval performance.Knowledge Graph: Entity extraction and relationship modeling.💬 Conversational RuntimeStreaming Response: Real-time typing effects with token-level streaming output.Multimodal Support: Image understanding and analysis capabilities.Message Referencing: Reference historical messages for contextual dialogue.AI Expression System: Dynamically switch avatars based on the emotional tone of the response.🔒 Security & GovernanceMPLP Permission Control: Fine-grained operational permission management.RLS (Row Level Security): Database-level multi-tenant isolation.API Key Encryption: AES-256 encrypted storage for sensitive credentials.Operation Audit Logs: Complete tracking of operational history.🛠 Tech StackCategoryTechnologyFrontend FrameworkReact 18 + TypeScript + ViteUI Componentsshadcn/ui + Radix UI + Tailwind CSSState ManagementZustand + TanStack QueryVisualizationReact Flow + RechartsBackend ServicesSupabase (PostgreSQL + Edge Functions)AI IntegrationOpenAI API Compatible Interfaces🚀 Quick StartPrerequisitesNode.js 18+npm or bunSupabase account (or a self-hosted instance)InstallationBash# 1. Clone the repository
git clone https://github.com/fance-studio/fance-studio.git
cd fance-studio

# 2. Install dependencies
npm install
# or
bun install

# 3. Configure environment variables
cp .env.example .env
# Edit the .env file and fill in the necessary configurations
Environment VariablesRefer to the .env.example file to configure the following variables:Bash# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# AI Service Configuration (Edge Functions)
AI_API_KEY=your_openai_api_key
AI_GATEWAY_URL=https://api.openai.com/v1/chat/completions
AI_EMBEDDING_URL=https://api.openai.com/v1/embeddings
📁 Project Structurefance-studio/
├── src/
│   ├── components/          # UI Components
│   │   ├── builder/         # Builder module
│   │   ├── foundry/         # Foundry module
│   │   ├── knowledge/       # Knowledge module
│   │   ├── runtime/         # Runtime module
│   │   └── ui/              # Base UI components
│   ├── hooks/               # Custom Hooks
│   ├── pages/               # Page components
│   ├── stores/              # Zustand state management
│   ├── types/               # TypeScript definitions
│   └── utils/               # Utility functions
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── _shared/         # Shared modules
│   │   ├── agent-chat/      # Chat service
│   │   ├── llm-gateway/     # LLM routing gateway
│   │   ├── rag-ingest/      # RAG document ingestion
│   │   └── ...              # Other functions
│   └── migrations/          # Database migrations
├── docs/                    # Project documentation
└── public/                  # Static assets
🌐 Deployment GuideVercel DeploymentBashnpm run build
vercel deploy
Supabase Edge FunctionsEdge Functions are automatically deployed upon code push. Ensure the following Secrets are configured in the Supabase Dashboard:AI_API_KEY - AI Service API KeyAI_GATEWAY_URL - AI Chat API EndpointAI_EMBEDDING_URL - Embedding API EndpointSelf-hostingBuild the production version: npm run buildDeploy the dist/ directory to any static hosting service.Configure your Supabase project and Edge Functions.🤝 Contributing GuideWe welcome all forms of contributions! Please check CONTRIBUTING.md for details.Contribution WorkflowFork this repository.Create a feature branch: git checkout -b feature/amazing-featureCommit your changes: git commit -m 'feat: add amazing feature'Push to the branch: git push origin feature/amazing-featureCreate a Pull Request.Code StandardsWrite all code in TypeScript.Follow ESLint and Prettier configurations.Write meaningful commit messages (follow Conventional Commits).Add tests for new features.📄 LicenseThis project is licensed under the MIT License.🙏 AcknowledgmentsReactSupabaseshadcn/uiReact Flow<div align="center"><p>Made with ❤️ by Fance Studio Team</p></div>

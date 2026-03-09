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
# NanoClaw Kernel — Standalone Deployment Guide

> NanoClaw Kernel is the container execution engine for FANCE Studio, providing RESTful API and SSE stream interfaces.  
> This guide walks you through full deployment and integration on your local machine or cloud server.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Requirements](#requirements)
- [⚡ One-Click Deploy (Recommended)](#-one-click-deploy-recommended)
- [Quick Deploy (Docker Compose)](#quick-deploy-docker-compose)
- [Manual Deploy (Without Docker Compose)](#manual-deploy-without-docker-compose)
- [Cloud Server Deploy](#cloud-server-deploy)
- [API Reference](#api-reference)
- [Integration with FANCE Studio](#integration-with-fance-studio)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

---

## Architecture Overview

```
┌─────────────────────────┐         HTTPS / SSE          ┌──────────────────────────┐
│    FANCE Studio (Shell)  │  ◄──────────────────────►   │   NanoClaw Kernel (API)   │
│                         │                              │                          │
│  · Visual orchestration │    nanoclaw-gateway          │  · Express API Server     │
│  · Intent / MPLP        │    (Edge Function proxy)     │  · Docker container mgmt  │
│  · Streaming UI         │                              │  · SSE terminal stream    │
│  · RuntimeSettings UI   │                              │  · Skill injection        │
└─────────────────────────┘                              └──────────┬───────────────┘
                                                                    │
                                                         Docker Socket (DooD)
                                                                    │
                                                         ┌──────────▼───────────────┐
                                                         │   Child (Ubuntu/Python)   │
                                                         │   Isolated sandbox        │
                                                         └──────────────────────────┘
```

**Key concept**: The Kernel mounts the host’s `/var/run/docker.sock` and uses **Docker-out-of-Docker (DooD)** to manage child containers; Docker does not need to be installed inside the container.

---

## Requirements

| Dependency | Min. Version | Check Command |
|------------|--------------|---------------|
| Docker | 20.10+ | `docker --version` |
| Docker Compose | 2.0+ | `docker compose version` |
| Git | 2.0+ | `git --version` |
| cURL | any | `curl --version` |

> **Optional**: If not using Docker for deployment, Node.js 20+ and npm/bun are also required.

---

## ⚡ One-Click Deploy (Recommended)

A single command handles Docker detection, image build, service start, and health-check verification on a fresh Linux server.

### Local Deploy

```bash
# Go to deploy directory
cd docs/nanoclaw-kernel

# Make executable and run
chmod +x deploy.sh && ./deploy.sh
```

### Remote Server Deploy

```bash
# 1. Upload deploy files to server
scp -r docs/nanoclaw-kernel/ user@your-server:~/nanoclaw-kernel

# 2. SSH in and run one-click deploy
ssh user@your-server "cd ~/nanoclaw-kernel && chmod +x deploy.sh && ./deploy.sh"
```

### Custom Token

```bash
# Use your own token instead of auto-generated
KERNEL_AUTH_TOKEN="my-custom-secure-token" ./deploy.sh
```

### Script Steps

`deploy.sh` runs these 10 steps:

| Step | Description | On Failure |
|------|-------------|------------|
| 1 | Detect OS (Linux/macOS) | Exit on unsupported OS |
| 2 | Detect Docker; install if missing | On macOS, prompt to install Docker Desktop |
| 3 | Detect Docker Compose plugin | Prompt to upgrade Docker |
| 4 | Generate auth token (64-char hex) | Use existing env var if set |
| 5 | Write `.env` | — |
| 6 | Build Docker image | Exit on build failure |
| 7 | Start service (background) | — |
| 8 | Wait for readiness (up to 30s) | On timeout, print logs and exit |
| 9 | Health check | On failure, print response |
| 10 | Auth check | Verify unauthorized requests are rejected |

On success, the script prints connection info (endpoint + token) that you can paste into FANCE Studio runtime settings.

---

## Quick Deploy (Docker Compose)

Recommended for local development and production.

### Step 1: Get deploy files

```bash
# If you already cloned FANCE Studio
cd docs/nanoclaw-kernel

# Or copy the deploy directory to the target machine
# scp -r docs/nanoclaw-kernel/ user@your-server:~/nanoclaw-kernel
```

### Step 2: Set auth token

**⚠️ Important: Change the default token; otherwise anyone can control your containers.**

```bash
# Generate a secure random token
export KERNEL_AUTH_TOKEN=$(openssl rand -hex 32)

# Save it; you’ll need it in FANCE Studio
echo "Your Kernel Token: $KERNEL_AUTH_TOKEN"
```

### Step 3: Start the service

```bash
# Build and start (background)
docker compose up -d --build

# Check logs
docker compose logs -f
```

You should see:

```
🚀 NanoClaw Kernel API Server is running on port 3100
```

### Step 4: Verify

```bash
# Health check
curl -s -H "Authorization: Bearer $KERNEL_AUTH_TOKEN" \
  http://localhost:3100/health | jq

# Expected:
# {
#   "status": "ok",
#   "version": "2.0",
#   "engine": "NanoClaw API Wrapper",
#   "uptime": 5.123
# }
```

```bash
# Auth check (no token)
curl -s http://localhost:3100/health

# Expected:
# {"error":"Unauthorized Kernel Access"}
```

### Step 5: Test container management

```bash
# Create a test container
curl -s -X POST \
  -H "Authorization: Bearer $KERNEL_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image": "ubuntu:22.04", "name": "test-sandbox"}' \
  http://localhost:3100/containers/create | jq

# Run a command in the container
curl -s -X POST \
  -H "Authorization: Bearer $KERNEL_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"containerId": "test-sandbox", "command": "echo Hello from NanoClaw!"}' \
  http://localhost:3100/execute | jq

# Remove test container
curl -s -X DELETE \
  -H "Authorization: Bearer $KERNEL_AUTH_TOKEN" \
  http://localhost:3100/containers/test-sandbox | jq
```

---

## Manual Deploy (Without Docker Compose)

For environments where you already have Node.js and prefer not to run the app in Docker.

### Step 1: Install dependencies

```bash
cd docs/nanoclaw-kernel
npm install
```

### Step 2: Start the service

```bash
# Set env vars
export KERNEL_AUTH_TOKEN="your-secure-token-here"
export PORT=3100

# Dev (with hot reload)
npm run dev

# Or production
npm run start:api
```

### Step 3: Verify

```bash
curl -H "Authorization: Bearer your-secure-token-here" http://localhost:3100/health
```

> **Note**: Manual deploy still requires Docker on the host, since the Kernel uses the `docker` CLI to manage child containers.

---

## Cloud Server Deploy

### Option A: Docker Compose (recommended)

```bash
# 1. SSH to your cloud server
ssh user@your-server

# 2. Install Docker if needed
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Re-login for docker group
exit && ssh user@your-server

# 3. Upload deploy files (from your machine)
scp -r docs/nanoclaw-kernel/ user@your-server:~/nanoclaw-kernel

# 4. On the server
cd ~/nanoclaw-kernel
export KERNEL_AUTH_TOKEN=$(openssl rand -hex 32)
echo "Token: $KERNEL_AUTH_TOKEN"  # Save this
docker compose up -d --build

# 5. Verify
curl -H "Authorization: Bearer $KERNEL_AUTH_TOKEN" http://localhost:3100/health
```

### Option B: Nginx reverse proxy + HTTPS

For a domain and HTTPS, use an Nginx config like:

```nginx
# /etc/nginx/sites-available/nanoclaw
server {
    listen 80;
    server_name kernel.yourdomain.com;

    # Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name kernel.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/kernel.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kernel.yourdomain.com/privkey.pem;

    # SSE: disable proxy buffering
    proxy_buffering off;
    proxy_cache off;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE long-lived connection
        proxy_set_header Connection '';
        proxy_read_timeout 86400s;
    }
}
```

```bash
# Obtain SSL certificate
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d kernel.yourdomain.com

# Enable site
sudo ln -s /etc/nginx/sites-available/nanoclaw /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Firewall

```bash
# Open only needed ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Do not expose 3100 to the internet (access via Nginx)
```

---

## API Reference

All requests must include the header: `Authorization: Bearer <KERNEL_AUTH_TOKEN>`.

| Method | Path | Description | Body |
|--------|------|-------------|------|
| `GET` | `/health` | Health check | — |
| `POST` | `/execute/stream` | SSE streaming execution | `{ containerId, command }` |
| `POST` | `/execute` | Synchronous execution | `{ containerId, command, workingDir? }` |
| `POST` | `/containers/create` | Create container | `{ image?, name?, memory?, cpu? }` |
| `DELETE` | `/containers/:id` | Remove container | — |
| `GET` | `/containers` | List containers | — |
| `GET` | `/containers/:id/status` | Container status | — |
| `POST` | `/skills/apply` | Inject skill | `{ skillName, skillContent }` |
| `POST` | `/files/read` | Read file in container | `{ containerId, filePath }` |
| `POST` | `/files/write` | Write file in container | `{ containerId, filePath, content }` |

### SSE event format

`/execute/stream` returns SSE events like:

```
event: stdout
data: {"content": "command output\n"}

event: stderr
data: {"content": "error output\n"}

event: exit
data: {"exitCode": 0, "durationMs": 1234}
```

---

## Integration with FANCE Studio

After deployment, configure the connection in FANCE Studio:

### Step 1: Open runtime settings

Go to **HIVE (Control Center) → Settings → Runtime**.

### Step 2: Fill in configuration

| Field | Value | Example |
|-------|------|--------|
| **NanoClaw endpoint** | Kernel URL | `http://localhost:3100` (local) or `https://kernel.yourdomain.com` (cloud) |
| **Auth token** | Your `KERNEL_AUTH_TOKEN` | `a1b2c3d4e5f6...` |

### Step 3: Test connection

Click **“Test connection”**. On success you’ll see:

- ✅ Connection successful
- Version: `2.0`
- Latency: `<100ms` (local) / `<500ms` (cloud)

### Step 4: Switch run mode

In settings, set the run mode to **NanoClaw** (default is Cloud).

### Step 5: Verify execution

On the **Runtime (Chat)** page:

- The top bar should show **“NanoClaw vX.X connected”** in green
- Send a message that triggers container actions and confirm SSE stream output

---

## Security

### Auth token

- **In production**, use a strong random token (at least 32 bytes).
- Send it via the header: `Authorization: Bearer <token>`.
- Do not hardcode the token; use environment variables.

### Docker socket

Mounting `/var/run/docker.sock` effectively grants **root**. Ensure:

1. The Kernel server is not exposed directly to the internet (use Nginx + HTTPS).
2. A strong token is used to prevent unauthorized access.
3. In production, consider [Docker Socket Proxy](https://github.com/Tecnativa/docker-socket-proxy) to limit which Docker API calls are allowed.

### SSRF protection

FANCE Studio’s `nanoclaw-gateway` Edge Function includes SSRF protection:

- Blocks private CIDR ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- DNS pre-resolution checks to mitigate DNS rebinding
- Path validation to prevent path traversal

---

## Troubleshooting

### Connection failed

```bash
# 1. Check if Kernel is running
docker compose ps
# or
curl http://localhost:3100/health

# 2. View logs
docker compose logs --tail=50

# 3. Check if port is in use
lsof -i :3100
```

### 401 Unauthorized

```bash
# Confirm token
echo $KERNEL_AUTH_TOKEN

# Restart with token
KERNEL_AUTH_TOKEN="your-token" docker compose up -d
```

### Docker commands failing

```bash
# Check Docker socket mount
docker compose exec nanoclaw-kernel ls -la /var/run/docker.sock

# Check Docker availability
docker compose exec nanoclaw-kernel docker ps
```

### SSE stream drops

- Ensure Nginx has `proxy_buffering` off
- Use a long `proxy_read_timeout` (e.g. 86400s)
- Ensure no CDN/WAF is closing long-lived connections

---

## Advanced Configuration

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | API listen port |
| `KERNEL_AUTH_TOKEN` | `YOUR_SECRET_KERNEL_TOKEN` | Auth token (**must change**) |

### Resource limits

You can set resource limits when creating a container:

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "python:3.11-slim",
    "name": "ml-sandbox",
    "memory": "512m",
    "cpu": "1.0"
  }' \
  http://localhost:3100/containers/create
```

### Service management

```bash
# Stop
docker compose down

# Restart
docker compose restart

# Update to latest
git pull
docker compose up -d --build

# Live logs
docker compose logs -f --tail=100
```

---

## FAQ

**Q: Do I have to deploy locally?**  
A: No. Any environment that can run Docker works (e.g. AWS EC2, Alibaba Cloud ECS). You only need a Docker runtime.

**Q: What’s the difference between Cloud mode and NanoClaw mode in FANCE Studio?**  
A: Cloud mode uses Edge Functions to call the AI API for chat. NanoClaw mode adds a real container execution environment where you can run code, manage the filesystem, and inject skills.

**Q: Can I run multiple Kernel instances?**  
A: Yes. Start multiple instances on different ports and switch the endpoint in FANCE Studio. Useful for dev/test/prod.

**Q: Is Windows supported?**  
A: Yes, via Docker Desktop (WSL2). Use socket path `//var/run/docker.sock` in docker-compose.yml.

---

<div align="center">
  <p>Made with ❤️ by FANCE Studio Team</p>
</div>

# NanoClaw Kernel — 独立部署指南

> NanoClaw Kernel 是 FANCE Studio 的容器执行引擎，提供 RESTful API 和 SSE 流接口。  
> 本文档将引导你在本地或云服务器上完成完整部署与联调。

---

## 目录

- [架构概览](#架构概览)
- [环境要求](#环境要求)
- [⚡ 一键部署（推荐）](#-一键部署推荐)
- [快速部署（Docker Compose）](#快速部署docker-compose)
- [手动部署（无 Docker Compose）](#手动部署无-docker-compose)
- [云服务器部署](#云服务器部署)
- [API 端点参考](#api-端点参考)
- [在 FANCE Studio 中联调](#在-fance-studio-中联调)
- [安全配置](#安全配置)
- [故障排查](#故障排查)
- [高级配置](#高级配置)

---

## 架构概览

```
┌─────────────────────────┐         HTTPS / SSE          ┌──────────────────────────┐
│    FANCE Studio (Shell)  │  ◄──────────────────────►   │   NanoClaw Kernel (API)   │
│                         │                              │                          │
│  · 可视化编排            │    nanoclaw-gateway          │  · Express API Server     │
│  · 意图识别 / MPLP       │    (Edge Function 代理)      │  · Docker 容器管理         │
│  · 流式消息渲染          │                              │  · SSE 终端流输出          │
│  · RuntimeSettings UI   │                              │  · 技能注入引擎            │
└─────────────────────────┘                              └──────────┬───────────────┘
                                                                    │
                                                         Docker Socket (DooD)
                                                                    │
                                                         ┌──────────▼───────────────┐
                                                         │   子容器 (Ubuntu/Python)   │
                                                         │   隔离的执行沙箱           │
                                                         └──────────────────────────┘
```

**关键概念**：Kernel 通过挂载宿主机的 `/var/run/docker.sock`，以 **Docker-out-of-Docker (DooD)** 方式管理子容器，无需在容器内安装 Docker。

---

## 环境要求

| 依赖 | 最低版本 | 检查命令 |
|------|---------|---------|
| Docker | 20.10+ | `docker --version` |
| Docker Compose | 2.0+ | `docker compose version` |
| Git | 2.0+ | `git --version` |
| cURL | 任意 | `curl --version` |

> **可选**：如果不使用 Docker 部署，还需要 Node.js 20+ 和 npm/bun。

---

## ⚡ 一键部署（推荐）

只需一行命令，即可在全新的 Linux 服务器上完成 Docker 安装检测、镜像构建、服务启动和健康检查验证。

### 本地部署

```bash
# 进入部署目录
cd docs/nanoclaw-kernel

# 赋予执行权限并运行
chmod +x deploy.sh && ./deploy.sh
```

### 远程服务器部署

```bash
# 1. 上传部署文件到服务器
scp -r docs/nanoclaw-kernel/ user@your-server:~/nanoclaw-kernel

# 2. SSH 到服务器并执行一键部署
ssh user@your-server "cd ~/nanoclaw-kernel && chmod +x deploy.sh && ./deploy.sh"
```

### 指定自定义 Token

```bash
# 如果想使用自己的 Token（而非自动生成）
KERNEL_AUTH_TOKEN="my-custom-secure-token" ./deploy.sh
```

### 脚本执行流程

`deploy.sh` 会自动完成以下 10 个步骤：

| 步骤 | 说明 | 失败处理 |
|------|------|---------|
| 1 | 检测操作系统（Linux/macOS） | 不支持的系统直接退出 |
| 2 | 检测 Docker，未安装则自动安装 | macOS 提示手动安装 Docker Desktop |
| 3 | 检测 Docker Compose 插件 | 提示升级 Docker |
| 4 | 生成安全认证 Token（64 字符 hex） | 使用已有环境变量 |
| 5 | 写入 `.env` 配置文件 | — |
| 6 | 构建 Docker 镜像 | 构建失败则退出 |
| 7 | 启动服务（后台运行） | — |
| 8 | 等待服务就绪（最多 30 秒） | 超时则输出日志并退出 |
| 9 | 健康检查验证 | 失败则输出响应详情 |
| 10 | 鉴权拦截验证 | 验证未授权请求被正确拒绝 |

部署成功后，脚本会输出完整的连接信息（端点地址 + Token），可直接复制到 FANCE Studio 的运行时设置中。

---

## 快速部署（Docker Compose）

这是推荐的部署方式，适用于本地开发和生产环境。

### 第 1 步：获取部署文件

```bash
# 如果你已经克隆了 FANCE Studio 仓库
cd docs/nanoclaw-kernel

# 或者单独复制部署目录到目标机器
# scp -r docs/nanoclaw-kernel/ user@your-server:~/nanoclaw-kernel
```

### 第 2 步：设置认证 Token

**⚠️ 重要：必须修改默认 Token，否则任何人都能控制你的容器。**

```bash
# 生成一个安全的随机 Token
export KERNEL_AUTH_TOKEN=$(openssl rand -hex 32)

# 记录下来，后续在 FANCE Studio 中需要填入
echo "你的 Kernel Token: $KERNEL_AUTH_TOKEN"
```

### 第 3 步：启动服务

```bash
# 构建并启动（后台运行）
docker compose up -d --build

# 查看日志确认启动成功
docker compose logs -f
```

你应该看到：

```
🚀 NanoClaw Kernel API Server is running on port 3100
```

### 第 4 步：验证部署

```bash
# 健康检查
curl -s -H "Authorization: Bearer $KERNEL_AUTH_TOKEN" \
  http://localhost:3100/health | jq

# 期望返回：
# {
#   "status": "ok",
#   "version": "2.0",
#   "engine": "NanoClaw API Wrapper",
#   "uptime": 5.123
# }
```

```bash
# 验证鉴权拦截（不带 Token）
curl -s http://localhost:3100/health

# 期望返回：
# {"error":"Unauthorized Kernel Access"}
```

### 第 5 步：测试容器管理

```bash
# 创建一个测试容器
curl -s -X POST \
  -H "Authorization: Bearer $KERNEL_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image": "ubuntu:22.04", "name": "test-sandbox"}' \
  http://localhost:3100/containers/create | jq

# 在容器中执行命令
curl -s -X POST \
  -H "Authorization: Bearer $KERNEL_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"containerId": "test-sandbox", "command": "echo Hello from NanoClaw!"}' \
  http://localhost:3100/execute | jq

# 清理测试容器
curl -s -X DELETE \
  -H "Authorization: Bearer $KERNEL_AUTH_TOKEN" \
  http://localhost:3100/containers/test-sandbox | jq
```

---

## 手动部署（无 Docker Compose）

适用于已有 Node.js 环境、不想使用容器化部署的场景。

### 第 1 步：安装依赖

```bash
cd docs/nanoclaw-kernel
npm install
```

### 第 2 步：启动服务

```bash
# 设置环境变量
export KERNEL_AUTH_TOKEN="your-secure-token-here"
export PORT=3100

# 开发模式（支持热重载）
npm run dev

# 或生产模式
npm run start:api
```

### 第 3 步：验证

```bash
curl -H "Authorization: Bearer your-secure-token-here" http://localhost:3100/health
```

> **注意**：手动部署仍然需要宿主机上安装了 Docker，因为 Kernel 会通过 `docker` CLI 命令管理子容器。

---

## 云服务器部署

### 方案 A：使用 Docker Compose（推荐）

```bash
# 1. SSH 到你的云服务器
ssh user@your-server

# 2. 安装 Docker（如果尚未安装）
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录使 docker 组生效
exit && ssh user@your-server

# 3. 上传部署文件
# (在本地执行)
scp -r docs/nanoclaw-kernel/ user@your-server:~/nanoclaw-kernel

# 4. (在服务器上执行)
cd ~/nanoclaw-kernel
export KERNEL_AUTH_TOKEN=$(openssl rand -hex 32)
echo "Token: $KERNEL_AUTH_TOKEN"  # 记录这个 Token
docker compose up -d --build

# 5. 验证
curl -H "Authorization: Bearer $KERNEL_AUTH_TOKEN" http://localhost:3100/health
```

### 方案 B：配置 Nginx 反向代理 + HTTPS

如果需要通过域名和 HTTPS 访问，创建 Nginx 配置：

```nginx
# /etc/nginx/sites-available/nanoclaw
server {
    listen 80;
    server_name kernel.yourdomain.com;

    # Let's Encrypt 验证
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

    # SSE 支持：关闭代理缓冲
    proxy_buffering off;
    proxy_cache off;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 长连接
        proxy_set_header Connection '';
        proxy_read_timeout 86400s;
    }
}
```

```bash
# 申请 SSL 证书
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d kernel.yourdomain.com

# 启用站点
sudo ln -s /etc/nginx/sites-available/nanoclaw /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 防火墙配置

```bash
# 仅开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (重定向到 HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 不要开放 3100 端口到公网（通过 Nginx 代理访问）
```

---

## API 端点参考

所有请求必须携带 `Authorization: Bearer <KERNEL_AUTH_TOKEN>` 头。

| 方法 | 路径 | 说明 | 请求体 |
|------|------|------|--------|
| `GET` | `/health` | 健康检查 | — |
| `POST` | `/execute/stream` | SSE 流式执行 | `{ containerId, command }` |
| `POST` | `/execute` | 同步执行 | `{ containerId, command, workingDir? }` |
| `POST` | `/containers/create` | 创建容器 | `{ image?, name?, memory?, cpu? }` |
| `DELETE` | `/containers/:id` | 销毁容器 | — |
| `GET` | `/containers` | 列出所有容器 | — |
| `GET` | `/containers/:id/status` | 容器状态 | — |
| `POST` | `/skills/apply` | 注入技能 | `{ skillName, skillContent }` |
| `POST` | `/files/read` | 读取容器文件 | `{ containerId, filePath }` |
| `POST` | `/files/write` | 写入容器文件 | `{ containerId, filePath, content }` |

### SSE 事件格式

`/execute/stream` 端点返回以下 SSE 事件：

```
event: stdout
data: {"content": "命令输出内容\n"}

event: stderr
data: {"content": "错误输出内容\n"}

event: exit
data: {"exitCode": 0, "durationMs": 1234}
```

---

## 在 FANCE Studio 中联调

部署完成后，在 FANCE Studio 中配置连接：

### 第 1 步：打开运行时设置

进入 **HIVE（控制中心） → 设置 → 运行时** 标签页。

### 第 2 步：填写配置

| 字段 | 值 | 示例 |
|------|-----|------|
| **NanoClaw 端点** | Kernel 的访问地址 | `http://localhost:3100`（本地）或 `https://kernel.yourdomain.com`（云端） |
| **认证 Token** | 部署时设置的 `KERNEL_AUTH_TOKEN` | `a1b2c3d4e5f6...` |

### 第 3 步：测试连接

点击 **"测试连接"** 按钮。成功时会显示：

- ✅ 连接成功
- 版本号：`2.0`
- 延迟：`<100ms`（本地）/ `<500ms`（云端）

### 第 4 步：切换运行模式

在设置中将运行模式切换为 **NanoClaw**（默认为 Cloud 模式）。

### 第 5 步：验证执行

回到 **Runtime（对话）** 页面：
- 顶部状态栏应显示绿色的 **"NanoClaw vX.X 已连接"**
- 发送包含容器操作的消息，观察是否有真实的 SSE 流输出

---

## 安全配置

### 认证 Token

- **生产环境必须**使用强随机 Token（至少 32 字节）
- Token 通过 `Authorization: Bearer <token>` 头传递
- 不要将 Token 硬编码在代码中，使用环境变量

### Docker Socket 安全

挂载 `/var/run/docker.sock` 等同于给予 **root 权限**，请确保：

1. Kernel 服务器不暴露在公网（通过 Nginx 反向代理 + HTTPS）
2. 使用强 Token 防止未授权访问
3. 生产环境考虑使用 [Docker Socket Proxy](https://github.com/Tecnativa/docker-socket-proxy) 限制 API 调用范围

### SSRF 防护

FANCE Studio 的 `nanoclaw-gateway` Edge Function 已内置 SSRF 防护：
- 拦截所有私有 CIDR 地址段（10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16）
- DNS 预解析验证防止 DNS 重绑定攻击
- 文件路径校验防止路径遍历

---

## 故障排查

### 连接失败

```bash
# 1. 检查 Kernel 是否在运行
docker compose ps
# 或
curl http://localhost:3100/health

# 2. 查看日志
docker compose logs --tail=50

# 3. 检查端口是否被占用
lsof -i :3100
```

### 401 Unauthorized

```bash
# 确认 Token 一致
echo $KERNEL_AUTH_TOKEN

# 重新启动并指定 Token
KERNEL_AUTH_TOKEN="your-token" docker compose up -d
```

### Docker 命令执行失败

```bash
# 检查 Docker Socket 是否正确挂载
docker compose exec nanoclaw-kernel ls -la /var/run/docker.sock

# 检查 Docker 是否可用
docker compose exec nanoclaw-kernel docker ps
```

### SSE 流中断

- 检查 Nginx 是否关闭了 `proxy_buffering`
- 确认 `proxy_read_timeout` 足够长（建议 86400s）
- 确保没有 CDN/WAF 中间层截断长连接

---

## 高级配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3100` | API 监听端口 |
| `KERNEL_AUTH_TOKEN` | `YOUR_SECRET_KERNEL_TOKEN` | 鉴权 Token（**必须修改**） |

### 资源限制

创建容器时可指定资源限制：

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

### 服务管理

```bash
# 停止服务
docker compose down

# 重启服务
docker compose restart

# 更新到最新版本
git pull
docker compose up -d --build

# 查看实时日志
docker compose logs -f --tail=100
```

---

## 常见问题

**Q: 我必须在本地部署吗？**  
A: 不一定。任何能运行 Docker 的环境都可以，包括云服务器（AWS EC2、阿里云 ECS 等）。关键是需要 Docker 运行时环境。

**Q: FANCE Studio 的 Cloud 模式和 NanoClaw 模式有什么区别？**  
A: Cloud 模式通过 Edge Function 调用 AI API 进行对话；NanoClaw 模式额外提供真实的容器执行环境，可以运行代码、管理文件系统、注入技能。

**Q: 可以同时运行多个 Kernel 实例吗？**  
A: 可以。在不同端口启动多个实例，然后在 FANCE Studio 中切换端点即可。适用于多环境（开发/测试/生产）场景。

**Q: 支持 Windows 吗？**  
A: 支持。Windows 上通过 Docker Desktop (WSL2 backend) 运行即可。将 docker-compose.yml 中的 socket 路径改为 `//var/run/docker.sock`。

---

<div align="center">
  <p>Made with ❤️ by FANCE Studio Team</p>
</div>

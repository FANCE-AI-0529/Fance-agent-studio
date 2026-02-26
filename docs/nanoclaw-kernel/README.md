# NanoClaw Kernel API Server

独立部署的容器执行引擎，为 FANCE Studio (Shell) 提供 RESTful API 和 SSE 流接口。

## 快速部署

```bash
# 1. 克隆此目录到云服务器
scp -r docs/nanoclaw-kernel/ user@your-server:~/nanoclaw-kernel

# 2. SSH 到服务器
ssh user@your-server
cd nanoclaw-kernel

# 3. 设置认证 Token
export KERNEL_AUTH_TOKEN="your-secure-token-here"

# 4. 使用 Docker Compose 启动
docker compose up -d

# 5. 验证
curl -H "Authorization: Bearer $KERNEL_AUTH_TOKEN" http://localhost:3100/health
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/execute/stream` | SSE 流式执行 |
| POST | `/execute` | 同步执行 |
| POST | `/containers/create` | 创建容器 |
| DELETE | `/containers/:id` | 销毁容器 |
| GET | `/containers` | 列出容器 |
| GET | `/containers/:id/status` | 容器状态 |
| POST | `/skills/apply` | 注入技能 |
| POST | `/files/read` | 读取容器文件 |
| POST | `/files/write` | 写入容器文件 |

## 在 FANCE Studio 中配置

1. 进入 Studio → 设置 → 运行时
2. 端点: `http://YOUR_SERVER_IP:3100`
3. Token: 你设置的 `KERNEL_AUTH_TOKEN`
4. 点击"测试连接"验证

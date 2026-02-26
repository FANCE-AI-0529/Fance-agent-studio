#!/usr/bin/env bash
# ============================================================================
# NanoClaw Kernel 一键部署脚本
# 用法: curl -fsSL <url>/deploy.sh | bash
#   或: chmod +x deploy.sh && ./deploy.sh
# ============================================================================

set -euo pipefail

# ─── 颜色输出 ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   🚀  NanoClaw Kernel 一键部署脚本  v2.0    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ─── 1. 检测操作系统 ───
info "检测操作系统..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    ok "Linux 系统"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    ok "macOS 系统"
else
    fail "不支持的操作系统: $OSTYPE（仅支持 Linux / macOS）"
fi

# ─── 2. 检测并安装 Docker ───
info "检测 Docker..."
if command -v docker &>/dev/null; then
    DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
    ok "Docker 已安装 (v${DOCKER_VERSION})"
else
    warn "Docker 未安装，正在自动安装..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://get.docker.com | sh
        sudo systemctl enable docker
        sudo systemctl start docker
        # 将当前用户加入 docker 组（避免需要 sudo）
        sudo usermod -aG docker "$USER" 2>/dev/null || true
        ok "Docker 安装完成"
        warn "已将用户 $USER 加入 docker 组，如果后续命令报权限错误，请重新登录终端"
    else
        fail "macOS 请先手动安装 Docker Desktop: https://docs.docker.com/desktop/install/mac-install/"
    fi
fi

# 验证 Docker 可用
if ! docker info &>/dev/null; then
    # 尝试用 sudo
    if sudo docker info &>/dev/null; then
        warn "Docker 需要 sudo 权限，后续命令将使用 sudo"
        DOCKER_CMD="sudo docker"
        COMPOSE_CMD="sudo docker compose"
    else
        fail "Docker 守护进程未运行，请执行: sudo systemctl start docker"
    fi
else
    DOCKER_CMD="docker"
    COMPOSE_CMD="docker compose"
fi

# ─── 3. 检测 Docker Compose ───
info "检测 Docker Compose..."
if $DOCKER_CMD compose version &>/dev/null; then
    COMPOSE_VERSION=$($DOCKER_CMD compose version --short 2>/dev/null || echo "v2+")
    ok "Docker Compose 可用 (${COMPOSE_VERSION})"
else
    fail "Docker Compose 不可用。Docker 20.10+ 自带 compose 插件，请升级 Docker"
fi

# ─── 4. 生成认证 Token ───
if [[ -z "${KERNEL_AUTH_TOKEN:-}" ]]; then
    info "未检测到 KERNEL_AUTH_TOKEN 环境变量，自动生成安全 Token..."
    KERNEL_AUTH_TOKEN=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 64)
    export KERNEL_AUTH_TOKEN
    echo ""
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️  请妥善保存以下 Token，在 FANCE Studio 设置中需要填入：           ║${NC}"
    echo -e "${YELLOW}║                                                                      ║${NC}"
    echo -e "${YELLOW}║  KERNEL_AUTH_TOKEN=${KERNEL_AUTH_TOKEN}  ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
else
    ok "使用已有 KERNEL_AUTH_TOKEN"
fi

# 写入 .env 文件供 docker-compose 读取
echo "KERNEL_AUTH_TOKEN=${KERNEL_AUTH_TOKEN}" > .env
ok ".env 文件已生成"

# ─── 5. 构建镜像 ───
info "构建 NanoClaw Kernel Docker 镜像..."
$COMPOSE_CMD build --no-cache
ok "镜像构建完成"

# ─── 6. 启动服务 ───
info "启动 NanoClaw Kernel 服务..."
$COMPOSE_CMD down 2>/dev/null || true
$COMPOSE_CMD up -d
ok "服务已启动（后台运行）"

# ─── 7. 等待服务就绪 ───
info "等待服务就绪..."
MAX_RETRIES=15
RETRY_INTERVAL=2
for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf -H "Authorization: Bearer ${KERNEL_AUTH_TOKEN}" http://localhost:3100/health &>/dev/null; then
        break
    fi
    if [[ $i -eq $MAX_RETRIES ]]; then
        echo ""
        warn "服务在 $((MAX_RETRIES * RETRY_INTERVAL)) 秒内未就绪，查看日志："
        $COMPOSE_CMD logs --tail=20
        fail "部署可能失败，请检查上方日志"
    fi
    echo -n "."
    sleep $RETRY_INTERVAL
done
echo ""

# ─── 8. 健康检查验证 ───
info "执行健康检查..."
HEALTH_RESPONSE=$(curl -sf -H "Authorization: Bearer ${KERNEL_AUTH_TOKEN}" http://localhost:3100/health)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"status":"ok"' || true)

if [[ -n "$HEALTH_STATUS" ]]; then
    ok "健康检查通过"
else
    fail "健康检查失败: $HEALTH_RESPONSE"
fi

# ─── 9. 鉴权验证 ───
info "验证鉴权拦截..."
AUTH_RESPONSE=$(curl -sf http://localhost:3100/health 2>&1 || true)
AUTH_CHECK=$(echo "$AUTH_RESPONSE" | grep -o '"Unauthorized"' || echo "$AUTH_RESPONSE" | grep -o '401' || true)

if [[ -n "$AUTH_CHECK" ]]; then
    ok "鉴权拦截正常（未授权请求已被拒绝）"
else
    warn "鉴权验证结果不确定，请手动验证"
fi

# ─── 10. 输出部署摘要 ───
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
ENGINE_VERSION=$(echo "$HEALTH_RESPONSE" | grep -oP '"version":"[^"]*"' | cut -d'"' -f4 || echo "2.0")

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ✅  NanoClaw Kernel 部署成功！                    ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║  引擎版本:  v${ENGINE_VERSION}                                          ║${NC}"
echo -e "${GREEN}║  监听端口:  3100                                             ║${NC}"
echo -e "${GREEN}║  本地访问:  http://localhost:3100                             ║${NC}"
echo -e "${GREEN}║  远程访问:  http://${SERVER_IP}:3100                     ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║  在 FANCE Studio 中配置:                                     ║${NC}"
echo -e "${GREEN}║    端点:  http://${SERVER_IP}:3100                       ║${NC}"
echo -e "${GREEN}║    Token: ${KERNEL_AUTH_TOKEN:0:16}...          ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  常用命令:                                                   ║${NC}"
echo -e "${GREEN}║    查看日志:    docker compose logs -f                       ║${NC}"
echo -e "${GREEN}║    停止服务:    docker compose down                          ║${NC}"
echo -e "${GREEN}║    重启服务:    docker compose restart                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

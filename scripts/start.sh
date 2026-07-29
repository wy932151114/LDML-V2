#!/bin/bash
# ============================================
# DZS-OS 道之自然 · 命理AI系统 — 启动脚本 (Linux/Mac)
# ============================================

set -e

echo "============================================"
echo "  DZS-OS 道之自然 · 命理AI系统"
echo "  正在启动..."
echo "============================================"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "[错误] 未检测到 Docker！"
    echo "请先安装 Docker Desktop：https://www.docker.com/products/docker-desktop/"
    echo "安装完成后重新运行本脚本。"
    exit 1
fi

# 检查 .env
if [ ! -f .env ]; then
    echo "[首次运行] 正在创建配置文件..."
    cp .env.example .env
    echo "配置文件已生成，请编辑 .env 修改配置："
    echo "  - JWT_SECRET：改成自己的一串随机字符"
    echo "  - MONGO_PASSWORD：数据库密码"
    echo ""
    echo "按 Ctrl+C 取消，或等待 15 秒自动继续..."
    sleep 15
fi

# 启动
echo "[1/3] 构建 Docker 镜像..."
docker compose build

echo "[2/3] 启动服务..."
docker compose up -d

echo "[3/3] 等待服务就绪..."
sleep 10

echo ""
echo "============================================"
echo "  ✅ 启动完成！"
echo ""
echo "  本地访问:  http://localhost:3333"
echo "  管理后台:  http://localhost:3333/console"
echo "  V1 API:    http://localhost:4000/api/v1"
echo "  V2 API:    http://localhost:5000/api"
echo ""
echo "  停止服务:  ./scripts/stop.sh"
echo "  查看日志:  docker compose logs -f"
echo "============================================"
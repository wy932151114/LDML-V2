#!/bin/bash
# 启动 DZS-OS 服务（更新路径）
set -e

ROOT="/root/projects/daozhiguang-fate-engine/daozhiguang"

# Backend
cd "$ROOT/packages/server"
nohup node dist/lite-main.js > /tmp/dzs-api.log 2>&1 &
echo "后端已启动 PID: $!"

# Frontend
cd "$ROOT/apps/web-console"
nohup npx next dev --port 3333 --hostname 0.0.0.0 > /tmp/dzs-web.log 2>&1 &
echo "前端已启动 PID: $!"

echo ""
echo "访问地址:"
echo "  H5用户端: http://172.31.138.38:3333/"
echo "  管理后台: http://172.31.138.38:3333/console/dashboard"
echo "  API:      http://172.31.138.38:4000/api/v1/health"

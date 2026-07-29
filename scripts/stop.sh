#!/bin/bash
# ============================================
# DZS-OS 道之自然 · 命理AI系统 — 停止脚本 (Linux/Mac)
# ============================================

echo "============================================"
echo "  DZS-OS 道之自然 · 命理AI系统"
echo "  正在停止服务..."
echo "============================================"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "[警告] 未检测到 Docker，尝试直接停止进程..."
    pkill -f "next dev.*3333" 2>/dev/null || true
    pkill -f "node dist/main.js" 2>/dev/null || true
    echo "已尝试停止进程"
    exit 0
fi

docker compose down

echo ""
echo "============================================"
echo "  ✅ 服务已停止"
echo "============================================"

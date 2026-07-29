@echo off
chcp 65001 >nul
title DZS-OS 停止服务

echo 正在停止 DZS-OS 服务...
docker compose down
echo.
echo ✅ 服务已停止（数据保留在 Docker volumes 中）
echo   如需同时删除数据，请运行：docker compose down -v
pause

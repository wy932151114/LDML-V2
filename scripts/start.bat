@echo off
chcp 65001 >nul
title DZS-OS 道之自然 · 命理AI系统

echo ============================================
echo   DZS-OS 道之自然 · 命理AI系统
echo   正在启动...
echo ============================================
echo.

REM 检查 Docker 是否已安装
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Docker！
    echo 请先安装 Docker Desktop：https://www.docker.com/products/docker-desktop/
    echo 安装完成后重新运行本脚本。
    pause
    exit /b 1
)

REM 检查 .env，没有则从模板复制
if not exist .env (
    echo [首次运行] 正在创建配置文件...
    copy .env.example .env >nul
    echo 配置文件已生成，请在 %cd%\.env 中修改配置：
    echo   - JWT_SECRET：改成自己的一串随机字符
    echo   - MONGO_PASSWORD：数据库密码
    echo   - PROVIDER_ENCRYPTION_KEY：API Key 加密密钥
    echo.
    echo 按任意键继续启动（可先修改配置再回来启动）...
    pause
)

REM 启动所有服务
echo [1/3] 构建 Docker 镜像...
docker compose build
if %errorlevel% neq 0 (
    echo [错误] 镜像构建失败！
    pause
    exit /b 1
)

echo [2/3] 启动服务...
docker compose up -d

echo [3/3] 等待服务就绪...
timeout /t 10 /nobreak >nul

echo.
echo ============================================
echo   ✅ 启动完成！
echo.
echo   本地访问:  http://localhost:3333
echo   管理后台:  http://localhost:3333/console
echo   V1 API:    http://localhost:4000/api/v1
echo   V2 API:    http://localhost:5000/api
echo.
echo   停止服务:  双击 stop.bat
echo   查看日志:  docker compose logs -f
echo ============================================
echo.
pause

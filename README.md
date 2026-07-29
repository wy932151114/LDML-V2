# 🖥️ 道之自然·命理AI — 本地开发版

> ⚠️ **此项目为本地开发版（Local Edition）**
> 用于 WSL 本地调试开发，支持热更新

## 使用方式

```bash
# 启动后端（端口 4000）
cd packages/server
npx tsx src/lite-main.ts

# 启动前端（端口 3333，热更新模式）
cd apps/web-console
npx next dev --port 3333 --hostname 0.0.0.0
```

## 快速启动

```bash
bash scripts/start-local.sh
```

## 访问地址

- 前端: http://localhost:3333
- 后端 API: http://localhost:4000/api/v1
- 局域网: http://192.168.1.38:3333

---

*本地开发版 — 独立 Git 仓库，单独维护*

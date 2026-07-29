# 使用 Node 20 官方镜像
FROM node:20-slim

# 安装 tsx
RUN npm install -g tsx

WORKDIR /app

# 复制依赖配置文件
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/server/package.json packages/server/package.json
COPY apps/web-console/package.json apps/web-console/package.json

# 安装依赖
RUN npm install

# 复制源码
COPY . .

# 编译 @dzg/core（server 在 node_modules/@dzg/core 中通过 workspace 软链接引用 dist/）
# 注意：npm workspace 创建了 node_modules/@dzg/core -> ../../packages/core 的软链接
# 编译输出到 packages/core/dist/，通过软链接可被 require
RUN cd packages/core && npx tsc --outDir dist --skipLibCheck && cd ../..

# 构建前端静态文件（lite-main.ts 会自动托管 out/ 目录）
RUN cd apps/web-console && npx next build && cd ../..

# 设置 Railway 期望的端口
ENV PORT=8080

EXPOSE 8080

# 启动
CMD ["npx", "tsx", "packages/server/src/lite-main.ts"]

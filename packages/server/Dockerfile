# ========================================
# DZS-OS V1 Server — Dockerfile
# 道之自然 · 命理AI V1 后端
# ========================================

# ---- Build Stage ----
FROM node:20-slim AS build

WORKDIR /app

RUN sed -i 's|deb.debian.org|mirrors.ustc.edu.cn|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true && \
    sed -i 's|deb.debian.org|mirrors.ustc.edu.cn|g' /etc/apt/sources.list 2>/dev/null || true && \
    apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files (root + workspace packages)
COPY package.json package-lock.json .npmrc ./
COPY packages/core/package.json packages/core/package.json
COPY packages/server/package.json packages/server/package.json

# Install all workspace dependencies
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source code
COPY . .

# Build @dzg/core library first
RUN cd packages/core && npx tsc --outDir dist --skipLibCheck && cd ../..

# Build server (NestJS)
RUN cd packages/server && npx nest build && cd ../..

# ---- Runtime Stage ----
FROM node:20-slim AS runtime

WORKDIR /app

RUN npm cache clean --force

# Copy built artifacts
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/server/package.json ./packages/server/
# Copy @dzg/core entire dir (workspace symlink resolves to this)
COPY --from=build /app/packages/core ./packages/core
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/', (r) => {process.exit(r.statusCode < 500 ? 0 : 1)}).on('error', () => process.exit(1))"

EXPOSE 4000

USER node

CMD ["node", "packages/server/dist/main.js"]

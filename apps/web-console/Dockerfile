# ========================================
# DZS-OS Web Console — Dockerfile
# 道之自然 · 命理AI 前端
# ========================================

# ---- Build Stage ----
FROM node:20-slim AS build

WORKDIR /app

RUN sed -i 's|deb.debian.org|mirrors.ustc.edu.cn|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true && \
    sed -i 's|deb.debian.org|mirrors.ustc.edu.cn|g' /etc/apt/sources.list 2>/dev/null || true && \
    apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY package.json package-lock.json .npmrc ./
COPY apps/web-console/package.json apps/web-console/package.json

# Install all workspace dependencies
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source code
COPY . .

# Build Next.js
RUN cd apps/web-console && npx next build && cd ../..

# ---- Runtime Stage ----
FROM node:20-slim AS runtime

WORKDIR /app

RUN npm cache clean --force

# Copy built artifacts
COPY --from=build /app/apps/web-console/.next ./apps/web-console/.next
COPY --from=build /app/apps/web-console/package.json ./apps/web-console/
COPY --from=build /app/apps/web-console/public ./apps/web-console/public
COPY --from=build /app/apps/web-console/next.config.js ./apps/web-console/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 3333

USER node

CMD ["sh", "-c", "cd /app/apps/web-console && npx next start --port 3333 --hostname 0.0.0.0"]
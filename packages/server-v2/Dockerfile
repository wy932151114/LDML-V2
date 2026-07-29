# ========================================
# DZS-OS V2 Server — Dockerfile
# ========================================

# ---- Build Stage ----
FROM node:20-slim AS build

WORKDIR /app

# Install build dependencies
RUN sed -i 's|deb.debian.org|mirrors.ustc.edu.cn|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true && \
    sed -i 's|deb.debian.org|mirrors.ustc.edu.cn|g' /etc/apt/sources.list 2>/dev/null || true && \
    apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY package.json package-lock.json .npmrc ./
COPY packages/server-v2/package.json packages/server-v2/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/dzs-protocols/package.json packages/dzs-protocols/package.json
COPY packages/utils/package.json packages/utils/package.json

# Install all workspace dependencies
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source code
COPY . .

# Build libraries
RUN cd packages/shared && npx tsc --outDir dist --skipLibCheck && cd ../..
RUN cd packages/dzs-protocols && npx tsc --outDir dist --skipLibCheck && cd ../..
RUN cd packages/utils && npx tsc --outDir dist --skipLibCheck && cd ../..

# Build server-v2
RUN cd packages/server-v2 && npx nest build && cd ../..

# ---- Runtime Stage ----
FROM node:20-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    chromium-common \
    chromium-sandbox \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/chromium /usr/bin/google-chrome-stable

RUN npm install -g tsx && npm cache clean --force

# Copy built artifacts
COPY --from=build /app/packages/server-v2/dist ./packages/server-v2/dist
COPY --from=build /app/packages/server-v2/package.json ./packages/server-v2/
COPY --from=build /app/packages/server-v2/.env.example ./packages/server-v2/.env
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/dzs-protocols ./packages/dzs-protocols
COPY --from=build /app/packages/utils ./packages/utils
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/v2/auth/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 5000

USER node

CMD ["node", "packages/server-v2/dist/main.js"]

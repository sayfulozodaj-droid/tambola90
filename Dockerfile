# ──────────────────────────────────────────────────
# Koyeb Dockerfile — tambola90-server
# Runtime: Node 20, output port: 10000
# ──────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# 1. Package manifest → layer caching
COPY package*.json ./
RUN npm ci --include=dev && npm cache clean --force

# 2. Source code + Prisma schema
COPY tsconfig.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/

# 3. Compile TypeScript
RUN npx prisma generate && npm run build

# 4. Production-only dependencies
RUN npm prune --production

EXPOSE 10000

ENV NODE_ENV=production
ENV PORT=10000
ENV UPLOAD_PATH=/tmp/uploads

# Healthcheck (optional but useful)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:10000/health || exit 1

CMD ["node", "dist/app.js"]

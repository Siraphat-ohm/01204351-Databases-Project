# ── 1. Install dependencies ────────────────────────────────────────────────
FROM oven/bun:latest AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ── 2. Build ───────────────────────────────────────────────────────────────
FROM oven/bun:latest AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
ENV MONGO_USER_DATABASE_URL="mongodb://root:password@localhost:27017/yok_logs?authSource=admin"
ENV BETTER_AUTH_SECRET="docker-build-placeholder"
ENV BETTER_AUTH_URL="http://localhost:3000"
ENV BETTER_AUTH_BASE_URL="http://localhost:3000"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV STRIPE_SECRET_KEY="sk_test_placeholder"
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_placeholder"
ENV STRIPE_WEBHOOK_SECRET="whsec_placeholder"
ENV NEXT_PUBLIC_MAPBOX_TOKEN="pk.placeholder"

RUN bunx prisma generate
RUN node node_modules/next/dist/bin/next build

# ── 3. Production runner ───────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

# Standalone output — minimal Next.js server
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Full node_modules needed for prisma migrate deploy at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

ENTRYPOINT ["sh", "-c", "node node_modules/.bin/prisma migrate deploy && node server.js"]
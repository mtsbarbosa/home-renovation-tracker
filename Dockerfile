FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/knexfile.cjs ./
COPY --from=builder /app/src/db/migrations ./src/db/migrations
COPY --from=builder /app/pnpm-lock.yaml* ./

USER node
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:migrate && node dist/index.js"]

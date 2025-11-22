FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache pnpm

COPY ../package.json ../pnpm-workspace.yaml ../pnpm-lock.yaml ./
COPY ../packages ./packages
COPY . ./ai-service

RUN pnpm install --frozen-lockfile

FROM node:20-alpine
WORKDIR /app/ai-service
ENV NODE_ENV=production

COPY --from=builder /app/ai-service ./

EXPOSE 8080
CMD ["node", "server.js"]

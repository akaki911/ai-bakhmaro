FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY backend ./backend

WORKDIR /app/backend
RUN pnpm install --frozen-lockfile

FROM node:20-alpine
WORKDIR /app/backend
ENV NODE_ENV=production

COPY --from=builder /app/backend ./

EXPOSE 5001
CMD ["node", "index.js"]

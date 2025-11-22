FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY gateway ./gateway

WORKDIR /app/gateway
RUN pnpm install --frozen-lockfile
RUN npm run build

FROM node:20-alpine
WORKDIR /app/gateway
ENV NODE_ENV=production

COPY --from=builder /app/gateway/dist ./dist
COPY --from=builder /app/gateway/package.json ./
COPY --from=builder /app/gateway/node_modules ./node_modules

EXPOSE 8080
CMD ["node", "dist/index.js"]

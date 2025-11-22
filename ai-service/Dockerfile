FROM node:20-alpine AS builder
WORKDIR /app

# Copy and install dependencies for ai-service
COPY ai-service/package.json ai-service/package-lock.json* ./ai-service/
WORKDIR /app/ai-service
RUN npm install

# Copy source code
WORKDIR /app
COPY ai-service/ ./ai-service/
COPY shared/ ./shared/

FROM node:20-alpine
WORKDIR /app/ai-service
ENV NODE_ENV=production

# Copy artifacts from the builder stage
COPY --from=builder /app/ai-service/node_modules ./node_modules
COPY --from=builder /app/ai-service/ .
COPY --from=builder /app/shared/ ../shared/

EXPOSE 8080
CMD ["node", "server.js"]

FROM node:20-alpine AS builder
WORKDIR /app

# Copy and install dependencies for backend
COPY backend/package.json backend/package-lock.json* ./backend/
WORKDIR /app/backend
RUN npm install

# Copy source code
WORKDIR /app
COPY backend/ ./backend/
COPY shared/ ./shared/

FROM node:20-alpine
WORKDIR /app/backend
ENV NODE_ENV=production

# Copy artifacts from the builder stage
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/ .
COPY --from=builder /app/shared/ ../shared/

EXPOSE 3000
CMD ["node", "index.js"]

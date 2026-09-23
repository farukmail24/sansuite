# Multi-stage Dockerfile for SanSuite SaaS Platform
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build client and server bundles
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads

EXPOSE 5000

CMD ["node", "dist/index.cjs"]

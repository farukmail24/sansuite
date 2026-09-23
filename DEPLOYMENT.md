# SanSuite — Production Deployment Guide

## Architecture Overview

```
Internet → Load Balancer → [Server #1, Server #2, Server #N]
                                    ↓
                            Redis (shared state)
                            MySQL (data)
                            AWS S3 (files)
```

---

## Prerequisites

| Service | Minimum | Recommended |
|---------|---------|-------------|
| Node.js | 18.x | 20.x LTS |
| MySQL | 8.0 | 8.0 (PlanetScale serverless) |
| Redis | 6.x | 7.x (Upstash or AWS ElastiCache) |
| File Storage | Local disk (single server) | AWS S3 (multi-server) |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values. See the file for documentation on each variable.

**Critical for auto-scaling:**
- `REDIS_URL` — required for distributed state (rate limits, IP bans, WebSocket sync)
- `AWS_S3_BUCKET` + credentials — required so all servers share the same file storage
- `DB_CONNECTION_LIMIT=5` — keep low per-server to avoid exhausting MySQL connections

---

## Option 1 — Railway (Easiest)

1. Push code to GitHub.
2. Create a new Railway project → "Deploy from GitHub repo".
3. Add services: **MySQL** and **Redis** (Railway provides both).
4. Set environment variables from `.env.example` in Railway dashboard.
5. Enable Railway's built-in auto-scaling under service settings.

```bash
# Railway CLI deploy
npm install -g @railway/cli
railway login
railway link
railway up
```

---

## Option 2 — Docker Compose (Self-hosted)

```yaml
# docker-compose.yml
version: "3.9"
services:
  app:
    build: .
    ports: ["5000:5000"]
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - DB_HOST=mysql
    depends_on: [mysql, redis]
    deploy:
      replicas: 3  # Run 3 instances

  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]

  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: sansuite
    volumes: [mysql_data:/var/lib/mysql]

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: [./nginx.conf:/etc/nginx/nginx.conf]
    depends_on: [app]

volumes:
  redis_data:
  mysql_data:
```

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "dist/server/index.js"]
```

---

## Option 3 — AWS ECS (Enterprise)

1. Push Docker image to ECR.
2. Create ECS cluster with Fargate.
3. Set up Application Load Balancer (ALB).
4. Use RDS (MySQL) and ElastiCache (Redis).
5. Enable ECS Service Auto Scaling:
   - Scale out: CPU > 70% → add 1 task
   - Scale in: CPU < 30% → remove 1 task

---

## Nginx Load Balancer Config (for Docker/VPS)

```nginx
upstream sansuite {
    least_conn;
    server app_1:5000;
    server app_2:5000;
    server app_3:5000;
}

server {
    listen 80;
    server_name yourdomain.com;

    location /ws {
        proxy_pass http://sansuite;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        proxy_pass http://sansuite;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

> [!IMPORTANT]
> The `X-Forwarded-For` header is essential — it ensures the real client IP
> reaches the rate limiter and IP ban system, not the load balancer's IP.

---

## Upstash Redis (Free Tier — Recommended for Start)

1. Go to [upstash.com](https://upstash.com) → Create Database → Redis.
2. Choose a region close to your servers.
3. Copy the **Redis URL** (starts with `rediss://`).
4. Set `REDIS_URL=rediss://default:password@...upstash.io:6379` in your `.env`.

---

## Health Check Endpoint

```
GET /api/health
→ { "status": "ok", "tenant": "default", "version": "1.0.0" }
```

Configure your load balancer to use this endpoint for health checks.
Unhealthy instances (non-200 response) will automatically be removed from rotation.

---

## Checklist Before Going Live

- [ ] `JWT_SECRET` is a long random string (not default)
- [ ] `REDIS_URL` is set (distributed mode)
- [ ] `AWS_S3_BUCKET` is set (shared file storage)
- [ ] `DB_CONNECTION_LIMIT` is tuned for your server count
- [ ] `ALLOWED_ORIGINS` includes your production domain
- [ ] SSL/TLS is configured on your load balancer
- [ ] Health check endpoint responds correctly
- [ ] Run `npm run check` → 0 TypeScript errors

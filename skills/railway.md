---
provider: railway
display_name: Railway
category: hosting
subcategories:
  - application-hosting
  - database-hosting
  - cron-jobs
  - private-networking
required_credentials:
  - RAILWAY_TOKEN
optional_credentials:
  - DATABASE_URL
  - REDIS_URL
  - RAILWAY_PROJECT_ID
  - RAILWAY_SERVICE_ID
frameworks:
  - docker
  - nixpacks
  - next.js
  - python
  - go
  - rust
osp_service_id: railway/hosting
docs_url: https://docs.railway.com
api_base: https://backboard.railway.com/graphql/v2
---

# Railway

Infrastructure platform for deploying apps, databases, and cron jobs. Auto-detects frameworks via Nixpacks, supports Docker, provides managed Postgres, MySQL, Redis, and MongoDB. Private networking between services.

## Quick Start

### 1. Install CLI

```bash
# macOS
brew install railway

# npm
npm install -g @railway/cli

# Auth
railway login
```

### 2. Create project and deploy

```bash
# Initialize new project
railway init

# Link existing project
railway link

# Deploy from current directory
railway up
```

### 3. Add a database

```bash
# Via dashboard: click "New" > "Database" > choose Postgres/Redis/MySQL/MongoDB
# Connection string is auto-injected as environment variable
```

## Credentials

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `RAILWAY_TOKEN` | API token for CLI and API access | Dashboard > Account > Tokens |
| `DATABASE_URL` | Auto-injected Postgres connection string | Service > Variables (auto-populated) |
| `REDIS_URL` | Auto-injected Redis connection string | Service > Variables (auto-populated) |
| `RAILWAY_PROJECT_ID` | Project identifier | Project Settings or URL |
| `RAILWAY_SERVICE_ID` | Service identifier | Service Settings |

### Auto-Injected Variables

Railway automatically injects these when you add a database service:
- Postgres: `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- Redis: `REDIS_URL`, `REDISHOST`, `REDISPORT`, `REDISUSER`, `REDISPASSWORD`
- MySQL: `MYSQL_URL`, `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

### Reference Variables

Railway supports inter-service variable references:

```
# In your app service, reference the database service's variables
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

## Common Operations

### Deploy

```bash
# Deploy from current directory (auto-detect with Nixpacks)
railway up

# Deploy specific service
railway up --service my-api

# Deploy with Docker
railway up --dockerfile Dockerfile

# View logs
railway logs

# Open service URL
railway open

# View deployment status
railway status
```

### Environment Variables

```bash
# Set variable
railway variables set API_KEY=secret123

# Set for specific service
railway variables set API_KEY=secret123 --service my-api

# List variables
railway variables

# Open variables editor in browser
railway variables --editor

# Use .env file
railway variables set --from .env
```

### railway.toml Configuration

```toml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5

[deploy.resources]
cpuLimit = 2
memoryLimit = "2Gi"
```

### Dockerfile Deploy

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### GraphQL API

Railway uses a GraphQL API for management operations.

```bash
# Create a project
curl -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { projectCreate(input: { name: \"my-project\" }) { id name } }"
  }'

# List projects
curl -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { projects { edges { node { id name } } } }"
  }'

# Get project details
curl -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { project(id: \"$PROJECT_ID\") { name services { edges { node { id name } } } } }"
  }'

# Trigger deployment
curl -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { serviceInstanceDeploy(input: { serviceId: \"$SERVICE_ID\", environmentId: \"$ENV_ID\" }) { id } }"
  }'
```

### Cron Jobs

```toml
# railway.toml for cron service
[deploy]
startCommand = "python job.py"
cronSchedule = "0 */6 * * *"  # Every 6 hours
```

Or configure in the dashboard: Service > Settings > Cron Schedule.

### Private Networking

Services in the same project communicate via internal DNS:

```
# Internal hostname format
<service-name>.railway.internal

# Example: API calling internal Postgres
DATABASE_URL=postgresql://user:pass@Postgres.railway.internal:5432/railway

# Example: API calling internal Redis
REDIS_URL=redis://default:pass@Redis.railway.internal:6379
```

Internal networking uses IPv6. Ensure your app listens on `::` or `0.0.0.0`.

### Postgres Operations

```bash
# Connect to Railway Postgres
railway connect postgres

# Or use psql directly
psql $DATABASE_URL

# Dump database
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

## Framework Guides

### Next.js

Railway auto-detects Next.js via Nixpacks. No configuration needed for most cases.

```bash
# Deploy
railway up

# Environment variables
railway variables set NEXT_PUBLIC_API_URL=https://api.example.com
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
```

```toml
# railway.toml (only if customization needed)
[build]
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
```

Ensure your Next.js app uses `PORT` environment variable (Railway sets it automatically):

```typescript
// next.config.ts — usually no changes needed
// Next.js automatically uses process.env.PORT
```

### Python (FastAPI)

```python
# main.py
from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "Hello from Railway"}
```

```toml
# railway.toml
[build]
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
```

### Go

```go
package main

import (
    "fmt"
    "net/http"
    "os"
)

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "3000"
    }

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello from Railway")
    })

    http.ListenAndServe(":"+port, nil)
}
```

### Monorepo

```toml
# railway.toml in project root
[build]
watchPatterns = ["packages/api/**", "packages/shared/**"]

[build.nixpacks]
nixpkgsArchive = "..."

[deploy]
startCommand = "cd packages/api && npm start"
```

Set the root directory in Railway dashboard: Service > Settings > Source > Root Directory.

### Multi-Service Architecture

```
Project
├── api (Node.js service)
│   ├── Uses DATABASE_URL=${{Postgres.DATABASE_URL}}
│   └── Exposes port 3000
├── worker (Python service)
│   ├── Uses REDIS_URL=${{Redis.REDIS_URL}}
│   └── Cron: every 5 minutes
├── Postgres (database service)
└── Redis (database service)
```

Each service is configured independently. Use reference variables to wire them together.

## Gotchas

1. **`PORT` is required.** Railway assigns a random port via the `PORT` env var. Your app MUST listen on `process.env.PORT` (or `$PORT`). Hardcoded ports will fail.

2. **Nixpacks auto-detection.** Railway uses Nixpacks to detect your framework. It reads `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, etc. If detection fails, add a `Dockerfile` or `railway.toml`.

3. **No persistent filesystem.** Deployments are ephemeral. Files written at runtime are lost on redeploy. Use a database, R2/S3, or volume mount for persistent data.

4. **Volume mounts.** Railway supports persistent volumes. Attach via dashboard: Service > Settings > Volumes. Mount at a specific path (e.g., `/data`).

5. **Private networking is IPv6.** Internal `.railway.internal` hostnames resolve to IPv6 addresses. Your app must listen on `::` or `0.0.0.0`, not `127.0.0.1`. Node.js `net.listen()` handles this automatically.

6. **Sleep policy.** Free tier services sleep after 10 minutes of inactivity. First request after sleep takes 5-10s (cold start). Paid plans do not sleep.

7. **Build vs runtime env vars.** Variables are available at both build and runtime by default. Use `railway variables set --no-build VAR=value` to restrict to runtime only.

8. **Database backups.** Railway Postgres has automatic daily backups (paid plans). Export manually with `pg_dump` for additional safety. Free tier has no automatic backups.

9. **Custom domains.** Add via dashboard: Service > Settings > Domains. Railway provides a `*.up.railway.app` domain by default. Custom domains require DNS CNAME to Railway.

10. **Resource limits.** Free tier: 500 hours/month execution, 512MB RAM, shared CPU. Set resource limits in `railway.toml` to avoid unexpected bills on paid plans.

11. **GraphQL API, not REST.** Railway's management API is GraphQL, not REST. Use the GraphQL endpoint for programmatic access. The CLI wraps this API.

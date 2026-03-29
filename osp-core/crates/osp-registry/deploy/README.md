# OSP Registry Deployment Guide

## Overview

The OSP Registry is an HTTP server (Axum + SQLite) that stores and serves OSP service manifests. It exposes a REST API on port 8080 with endpoints for manifest submission, search, and reputation queries.

## Quick Start (Docker)

```bash
cd osp-core/crates/osp-registry

# Copy and configure environment
cp .env.example .env

# Build and run
docker compose up --build
```

The registry will be available at `http://localhost:8080`.

Verify it is running:

```bash
curl http://localhost:8080/health
# → {"service":"osp-registry","status":"healthy"}
```

## Docker Details

The `Dockerfile` uses a multi-stage build:

1. **Builder stage** (`rust:1.77-slim`) -- compiles the workspace and produces a release binary.
2. **Runtime stage** (`debian:bookworm-slim`) -- minimal image with only the binary, `sqlite3`, `curl`, and CA certificates. Runs as a non-root `osp` user (UID 1001).

Build context must be the workspace root (`osp-core/`) because the registry depends on sibling crates (`osp-crypto`, `osp-manifest`).

### docker-compose.yml

- Maps host port 8080 to container port 8080.
- Persists SQLite data in a named volume (`registry-data` mounted at `/data`).
- Passes environment variables from the host (or `.env` file).

## Fly.io Deployment

### First deploy

```bash
cd osp-core/crates/osp-registry

# Launch the app (this creates the app on Fly.io)
fly launch --no-deploy

# Create a persistent volume for SQLite
fly volumes create registry_data --region iad --size 1

# Set secrets
fly secrets set OSP_REGISTRY_ADMIN_KEY=$(openssl rand -hex 32)

# Deploy
fly deploy --remote-only
```

### Subsequent deploys

```bash
fly deploy --remote-only
```

### Scaling

The `fly.toml` is configured for:

- **Region**: `iad` (US East). Change `primary_region` as needed.
- **Memory**: 256 MB per machine.
- **Auto-scaling**: min 1, max controlled by Fly's machine auto-start/stop.
- **Health checks**: GET `/health` every 30s.

To scale manually:

```bash
fly scale count 3
fly scale memory 512
```

## Manual Build (No Docker)

```bash
cd osp-core

# Build release binary
cargo build --release --package osp-registry

# Run
PORT=8080 \
DATABASE_URL=sqlite://./registry.db \
RUST_LOG=info \
./target/release/osp-registry
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP listen port |
| `DATABASE_URL` | `osp-registry.db` | SQLite path (strip `sqlite://` prefix) |
| `RUST_LOG` | `info` | Log level (`trace`, `debug`, `info`, `warn`, `error`) |
| `OSP_REGISTRY_ADMIN_KEY` | *(none)* | Admin key for privileged operations |

## Health Check

```bash
curl -f http://localhost:8080/health
```

Returns HTTP 200 with:

```json
{"service": "osp-registry", "status": "healthy"}
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/manifests` | Submit a manifest |
| `GET` | `/api/v1/manifests/{provider_id}` | Get a manifest |
| `DELETE` | `/api/v1/manifests/{provider_id}` | Delete a manifest |
| `GET` | `/api/v1/search` | Search manifests |
| `GET` | `/api/v1/reputation/{provider_id}` | Get provider reputation |

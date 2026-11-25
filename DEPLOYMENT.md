# Production Deployment Guide: ResearchVault

This document provides architecture specifications, hardening guidelines, container orchestration instructions, and reverse proxy templates for deploying ResearchVault into production cloud environments.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & System Requirements](#2-prerequisites--system-requirements)
3. [Production Environment Configuration](#3-production-environment-configuration)
4. [Docker Compose Deployment](#4-docker-compose-deployment)
5. [Reverse Proxy & SSL (Nginx & Caddy)](#5-reverse-proxy--ssl-nginx--caddy)
6. [PostgreSQL Migration Guide](#6-postgresql-migration-guide)
7. [Persistent Volumes & Backup Runbook](#7-persistent-volumes--backup-runbook)
8. [Health Probes & Monitoring](#8-health-probes--monitoring)
9. [Troubleshooting & Runbook](#9-troubleshooting--runbook)

---

## 1. Architecture Overview

ResearchVault in production is composed of two primary application tiers and persistent volumes:

- **Frontend Container**: Next.js 14 running in standalone output mode (`node server.js`) under non-root user `nextjs:nodejs`.
- **Backend Container**: FastAPI running under non-root user `vaultuser:vaultgroup` with Uvicorn multi-worker process management.
- **Persistent Data**:
  - `./uploads`: Physical research documents (PDF, DOCX, TXT).
  - `./chroma_db`: ChromaDB vector index and metadata parquet files.
  - Database: Managed PostgreSQL instance or SQLite container volume `./data`.

---

## 2. Prerequisites & System Requirements

- **Operating System**: Ubuntu 22.04 LTS / Debian 12 / Rocky Linux 9.
- **Compute**: Minimum 2 vCPUs, 4 GB RAM (8 GB RAM recommended for multi-worker neural embedding & reranking).
- **Disk**: 40 GB+ NVMe SSD storage.
- **Software**: Docker Engine 24.0+ and Docker Compose v2.20+.

---

## 3. Production Environment Configuration

Create a production `.env` file on your server (ensure permissions are `chmod 600 .env`):

```env
PROJECT_NAME=ResearchVault
API_V1_STR=/api
SECRET_KEY=prod_super_secret_key_generate_with_openssl_rand_hex_32
DATABASE_URL=postgresql://vaultuser:YourStrongPassword@postgres:5432/researchvault
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_SIZE=52428800
CHROMA_PERSIST_DIRECTORY=/app/chroma_db
CHROMA_COLLECTION_NAME=research_vault_chunks
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
RERANKER_MODEL_NAME=cross-encoder/ms-marco-MiniLM-L-6-v2
HF_HOME=/app/cache/huggingface
CORS_ORIGINS=["https://researchvault.yourdomain.edu"]

# Frontend public connection
NEXT_PUBLIC_API_URL=https://researchvault.yourdomain.edu/api
```

---

## 4. Docker Compose Deployment

Run the production stack in detached mode:

```bash
docker-compose -f docker-compose.yml up --build -d
```

Verify running containers:
```bash
docker-compose ps
```

Seed the default demonstration corpus:
```bash
docker-compose exec backend python app/scripts/seed_corpus.py
```

---

## 5. Reverse Proxy & SSL (Nginx & Caddy)

### 5.1 Nginx Configuration
Place this in `/etc/nginx/sites-available/researchvault.conf`:

```nginx
server {
    listen 80;
    server_name researchvault.yourdomain.edu;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name researchvault.yourdomain.edu;

    ssl_certificate /etc/letsencrypt/live/researchvault.yourdomain.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/researchvault.yourdomain.edu/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    # Next.js Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # FastAPI Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Byte-range streaming for PDF viewer
        proxy_buffering off;
        proxy_cache off;
    }
}
```

### 5.2 Caddy Configuration (Alternative with Automatic SSL)
In `/etc/caddy/Caddyfile`:

```caddy
researchvault.yourdomain.edu {
    encode gzip zstd

    # Route backend API requests
    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }

    # Route frontend requests
    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

---

## 6. PostgreSQL Migration Guide

For enterprise high-concurrency deployments, swap SQLite for PostgreSQL:

1. Add PostgreSQL to `docker-compose.yml`:
```yaml
  postgres:
    image: postgres:16-alpine
    container_name: researchvault-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: researchvault
      POSTGRES_USER: vaultuser
      POSTGRES_PASSWORD: YourStrongPassword
    volumes:
      - ./pgdata:/var/lib/postgresql/data
```
2. Update `DATABASE_URL` in `.env`:
```env
DATABASE_URL=postgresql://vaultuser:YourStrongPassword@postgres:5432/researchvault
```
3. Start stack. SQLAlchemy's `init_db()` will automatically create tables on boot.

---

## 7. Persistent Volumes & Backup Runbook

### Backup Schedule
Set up a daily cron job to backup the database, vector store, and uploaded documents:

```bash
#!/bin/bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/researchvault/$BACKUP_DATE
mkdir -p $BACKUP_DIR

# 1. Backup Uploads
tar -czf $BACKUP_DIR/uploads.tar.gz ./uploads

# 2. Backup ChromaDB
tar -czf $BACKUP_DIR/chroma_db.tar.gz ./chroma_db

# 3. Backup Database (PostgreSQL)
docker-compose exec -T postgres pg_dump -U vaultuser researchvault > $BACKUP_DIR/db.sql

# Retain backups for 30 days
find /var/backups/researchvault -type d -mtime +30 -exec rm -rf {} +
```

---

## 8. Health Probes & Monitoring

ResearchVault provides a deep diagnostic health check endpoint at `/api/health`.

### Automated Health Probe Check
```bash
curl -i https://researchvault.yourdomain.edu/api/health
```

Example healthy response (`HTTP 200`):
```json
{
  "status": "healthy",
  "service": "ResearchVault",
  "version": "1.0.0",
  "uptime_seconds": 1284.2,
  "checks": {
    "database": {
      "status": "ok",
      "latency_ms": 1.45
    },
    "vector_store": {
      "status": "ok",
      "collection": "research_vault_chunks",
      "total_chunks": 42
    },
    "storage": {
      "status": "ok",
      "upload_dir": "/app/uploads",
      "writable": true,
      "free_space_mb": 42510.8
    }
  }
}
```

If any core dependency fails, the endpoint returns `HTTP 503 Service Unavailable`, allowing AWS Route53, Kubernetes probes, or Cloudflare health checks to trigger failover or restart alerts.

---

## 9. Troubleshooting & Runbook

| Symptom | Root Cause | Remediation |
|---|---|---|
| `HTTP 429 Too Many Requests` | Exceeded rate limit (e.g. 10/min auth, 20/min upload) | Wait for `Retry-After` duration or adjust limit in `app/core/rate_limiter.py`. |
| `HTTP 403 Access Denied: Path traversal detected` | File path in database attempts escape outside `UPLOAD_DIR` | Validate upload directory configuration and file path consistency. |
| Embedded PDF Viewer shows blank/grey frame | Security headers blocking iframe or missing byte-range headers | Verify `X-Frame-Options: SAMEORIGIN` and Nginx `proxy_buffering off;`. |
| Cold-start query delay | Model downloading on first request | Ensure `HF_HOME=/app/cache/huggingface` volume is mounted and pre-warmed. |

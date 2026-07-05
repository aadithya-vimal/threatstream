# ThreatStream Production Self-Hosted Deployment Guide

This document outlines the architecture and deployment steps to run ThreatStream as a production-grade, self-hosted Security Operations Platform (SOC) on-premises or on a private virtual machine (VPS) with zero cloud vendor lock-in.

---

## 1. Enterprise Architecture Overview

The ThreatStream self-hosted environment is structured around containerized microservices managed via **Docker Compose**:

```mermaid
graph TD
    Client[Browser Console] <-->|HTTP / WebSockets| API[FastAPI Web Server]
    API <-->|Read / Write| Postgres[(PostgreSQL DB)]
    API <-->|Publish / Subscribe| Redis[(Redis Cache & Broker)]
    Worker[Python Celery Worker] <-->|Tasks Queue| Redis
    Worker <-->|Write Indicators| Postgres
    Cron[Systemd/Celery Beat] -->|Trigger Scans & Feeds| Redis
```

### Components
1. **Frontend**: Static React bundle compiled using Vite, served via a reverse proxy (Nginx) or FastAPI static mounts.
2. **FastAPI Web Server**: Handles REST API requests and hosts WebSocket connection rooms to broadcast live honeypot threats.
3. **Redis Broker & Cache**: Acts as a pub/sub manager for WebSockets and serves as the queue backend for asynchronous tasks.
4. **PostgreSQL Relational DB**: Stores assets registry, CVE vulnerabilities data, incident cases, Sigma/YARA rules, and access key records.
5. **Python Celery Workers**: Processes background tasks like running network discovery scanners (Nmap, Nuclei) and querying enrichment feeds (VirusTotal, AbuseIPDB).

---

## 2. Docker Compose Infrastructure Spec

Create a `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  # 1. FastAPI App & WebSockets
  api:
    image: threatstream/api:latest
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://threat_admin:ts_secure_pass@postgres:5432/threatstream
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET=ts_jwt_secret_token_1234
    depends_on:
      - postgres
      - redis
    restart: always

  # 2. Celery Worker (Background Scans & Feeds)
  worker:
    image: threatstream/api:latest
    command: celery -A workers.tasks worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://threat_admin:ts_secure_pass@postgres:5432/threatstream
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
    restart: always

  # 3. Celery Beat (Scheduler for Cron Jobs)
  beat:
    image: threatstream/api:latest
    command: celery -A workers.tasks beat --loglevel=info
    environment:
      - DATABASE_URL=postgresql://threat_admin:ts_secure_pass@postgres:5432/threatstream
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
    restart: always

  # 4. Redis Cache & Broker
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ts_redis_pass
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: always

  # 5. PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: threat_admin
      POSTGRES_PASSWORD: ts_secure_pass
      POSTGRES_DB: threatstream
    volumes:
      - pg_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: always

volumes:
  pg_data:
  redis_data:
```

---

## 3. Database Schema Blueprint (PostgreSQL)

To support self-hosting, the following relational database schemas are created inside PostgreSQL:

### A. Assets Table
```sql
CREATE TABLE assets (
    id VARCHAR(50) PRIMARY KEY,
    hostname VARCHAR(100) NOT NULL UNIQUE,
    ip VARCHAR(45) NOT NULL,
    mac VARCHAR(17) NOT NULL,
    vendor VARCHAR(100),
    os VARCHAR(100),
    asset_type VARCHAR(50) NOT NULL,
    criticality VARCHAR(20) NOT NULL,
    risk_score INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Online',
    owner VARCHAR(100),
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    patch_status VARCHAR(50) DEFAULT 'Up to Date'
);
```

### B. Vulnerabilities Table (CVEs)
```sql
CREATE TABLE vulnerabilities (
    id SERIAL PRIMARY KEY,
    cve VARCHAR(20) NOT NULL,
    cvss NUMERIC(3,1) NOT NULL,
    summary TEXT,
    patched BOOLEAN DEFAULT FALSE,
    asset_id VARCHAR(50) REFERENCES assets(id) ON DELETE CASCADE
);
```

### C. Indicators of Compromise (IOCs) Table
```sql
CREATE TABLE indicators (
    id VARCHAR(50) PRIMARY KEY,
    value VARCHAR(255) NOT NULL UNIQUE,
    ioc_type VARCHAR(20) NOT NULL,
    asn VARCHAR(100),
    country VARCHAR(2),
    threat_type VARCHAR(50),
    confidence INT CHECK(confidence >= 0 AND confidence <= 100),
    severity VARCHAR(20) NOT NULL,
    mitre_id VARCHAR(15),
    mitre_name VARCHAR(100),
    source_feed VARCHAR(50),
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);
```

---

## 4. API & WebSocket Live Ingestion (FastAPI Snippet)

The self-hosted API utilizes standard WebSockets to broadcast live threats:

```python
# backend/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Handle disconnected socket cleanups
                self.disconnect(connection)

manager = ConnectionManager()

@app.websocket("/ws/threats")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Maintain connection alive heartbeat
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

---

## 5. Deployment Step-by-Step

### 1. Build and Run Containers
```bash
docker-compose up -d --build
```

### 2. Run Database Migrations
Initialize database tables using Python Alembic:
```bash
docker-compose exec api alembic upgrade head
```

### 3. Verify System Operations
- **FastAPI Endpoint Docs**: `http://localhost:8000/docs`
- **Websockets Stream Node**: `ws://localhost:8000/ws/threats`
- **Console Web App Port**: Open `http://localhost:5173` (Vite local console server)

### 4. Logging & Maintenance
Review Celery workers ingestion logs:
```bash
docker-compose logs -f worker
```
Check DB connections metrics:
```bash
docker-compose exec postgres pg_isready -U threat_admin
```

---

**Architecture Status**: Ready for self-hosted production deployment ✅

# MedGuard AI • Production Deployment & Infrastructure Guide

This guide covers deployment strategies for containerized environments (Docker Compose, Kubernetes) and bare-metal servers with NGINX reverse proxy, SSL termination, and environment variable tuning.

---

## 1. Quick Start with Docker Compose

MedGuard AI includes a pre-configured multi-container `docker-compose.yml` orchestrating the FastAPI backend and Next.js frontend with isolated bridge networking and persistent volumes.

### Launching the Stack:
```bash
# Clone or navigate to the workspace
cd YGC

# Optional: Set your Gemini API key in the environment
export GEMINI_API_KEY="your_production_key_here"

# Build and start containers in detached mode
docker-compose up -d --build
```

### Accessing the Running Services:
- **Frontend Healthcare Dashboard:** `http://localhost:3000`
- **FastAPI Backend Gateway:** `http://localhost:8000`
- **Interactive OpenAPI Documentation:** `http://localhost:8000/docs`

### Stopping & Inspecting Containers:
```bash
# View real-time logs
docker-compose logs -f

# Check container health status
docker-compose ps

# Graceful shutdown
docker-compose down
```

---

## 2. Environment Variables Specification

### Backend Configuration (`backend/.env` or Docker env):
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | Port for FastAPI / Uvicorn server |
| `HOST` | `0.0.0.0` | Bind host address |
| `DATABASE_URL` | `sqlite:///./medguard.db` | SQLite or PostgreSQL connection string (`postgresql://user:pass@host:5432/medguard`) |
| `GEMINI_API_KEY` | *(optional / demo_mode)* | Google Gemini LLM API key for advanced natural language reasoning |
| `ENVIRONMENT` | `production` | Environment runtime (`development` / `production`) |
| `CORS_ORIGINS` | `*` | Allowed CORS origins for the frontend client |

### Frontend Configuration (`frontend/.env.local` or Docker env):
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API gateway base URL |
| `NODE_ENV` | `production` | Node.js production runtime mode |
| `PORT` | `3000` | Next.js server port |

---

## 3. Production NGINX Reverse Proxy Configuration

Below is a production NGINX configuration block with SSL termination, HTTP/2, WebSocket support, and 20MB file upload limits:

```nginx
server {
    listen 80;
    server_name medguard.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name medguard.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/medguard.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medguard.yourdomain.com/privkey.pem;

    client_max_body_size 25M;

    # Frontend Route
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API Gateway Route
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Database Migrations & Scaling

- **Switching to PostgreSQL:**
  Simply change `DATABASE_URL` in `backend/.env`:
  ```bash
  DATABASE_URL=postgresql://medguard_admin:secure_password@postgres:5432/medguard_db
  ```
  SQLAlchemy automatically creates all required tables and relationships on application startup (`Base.metadata.create_all`).
- **File Storage Persistence:**
  Uploaded PDFs and image records are saved to the persistent volume `backend-data` mounted at `/app/uploads`. For cloud scale (AWS/GCP/Azure), the `ocr_service.py` file storage can be configured to point to an S3 or GCS bucket.

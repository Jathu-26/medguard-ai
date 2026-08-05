# Multi-stage Unified Dockerfile for MedGuard AI (Single Link Full-Stack Deployment)
# Stage 1: Build Next.js Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Production Runner (Python + Node.js)
FROM python:3.11-slim AS runner

WORKDIR /app

# Install system dependencies, Node.js and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    build-essential \
    tesseract-ocr \
    libtesseract-dev \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy Backend application
COPY backend/ ./backend/
COPY demo-data/ ./demo-data/

# Copy Frontend built assets & node_modules
COPY --from=frontend-builder /app/frontend ./frontend

# Create storage directory for uploads
RUN mkdir -p /app/backend/uploads

# Copy single-container start script
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Expose default port
EXPOSE 10000

ENV PORT=10000
ENV HOST=0.0.0.0
ENV ENVIRONMENT=production

# Health check against Next.js /health rewrite
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["./start.sh"]

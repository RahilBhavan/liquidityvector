# ============================================ 
# Stage 1: Build Environment (Alpine) 
# ============================================ 
FROM python:3.11-alpine AS builder

WORKDIR /app

# Install system dependencies for C-extensions (uvloop, httptools) 
RUN apk add --no-cache build-base gcc musl-dev python3-dev libffi-dev

# Use a virtual environment to keep the build clean 
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ============================================ 
# Stage 2: Runtime Environment (Minimal) 
# ============================================ 
FROM python:3.11-alpine

WORKDIR /app

# Install runtime-only dependencies (curl for Railway healthprober) 
RUN apk add --no-cache curl

# Copy virtualenv from builder 
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH=/app

# Railway & Production Optimizations 
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    ENVIRONMENT=production

# Create and switch to non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

# Copy Logic (api and core)
COPY --chown=appuser:appgroup api/ ./api
COPY --chown=appuser:appgroup core/ ./core
# Pre-compile for faster startup 
RUN python -m compileall /app/api /app/core

USER appuser

# Railway uses dynamic $PORT (standardizes to 8080 or 8000) 
EXPOSE 8000

# Healthcheck specifically for Railway's container orchestration 
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Performance-tuned Uvicorn startup 
# --proxy-headers: Ensures FastAPI sees real client IPs from Railway's load balancer 
# --forwarded-allow-ips '*': Trust all proxies (Railway infrastructure) 
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --loop uvloop --http httptools --proxy-headers --forwarded-allow-ips '*'"]

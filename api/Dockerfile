# ============================================
# Stage 1: Builder
# ============================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies for native extensions (uvloop, httptools, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements to leverage Docker cache
COPY api/requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# ============================================
# Stage 2: Final Runner
# ============================================
FROM python:3.11-slim

WORKDIR /app

# Performance and optimization env vars
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PYTHONPATH=/app \
    PATH=/home/appuser/.local/bin:$PATH

# Install runtime dependencies (curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy installed dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code and core logic
# We do this late to maximize layer caching for dependencies
COPY api/ ./api
COPY core/ ./core

# Pre-compile bytecode for faster startup
RUN python -m compileall /app/api /app/core

# Ensure non-root user owns the app directory
RUN chown -R appuser:appuser /app

USER appuser

# Railway uses $PORT environment variable
EXPOSE 8000

# Health check using the internal port
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start uvicorn with performance-optimized workers and proxy support
# We use a shell-style CMD to allow environment variable expansion ($PORT)
CMD uvicorn api.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers 1 \
    --loop uvloop \
    --http httptools \
    --proxy-headers \
    --forwarded-allow-ips "*"

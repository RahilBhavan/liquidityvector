# ============================================ 
# Stage 1: Build Environment (Debian Slim) 
# ============================================ 
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Use virtualenv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ============================================ 
# Stage 2: Final Runner (Minimal Slim)
# ============================================ 
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies (curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* 
    && apt-get clean

# Create non-root user
RUN groupadd -r appuser && useradd -m -r -g appuser appuser

# Copy virtualenv and set paths
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH=/app

# Production Optimizations
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    ENVIRONMENT=production

# Copy Logic
COPY api/ ./api
COPY core/ ./core

# Fix permissions
RUN chown -R appuser:appuser /app

USER appuser

# Expose port
EXPOSE 8000

# Start uvicorn
# Using the shell form to ensure $PORT expansion
# Added --root-path if needed, but keeping it simple for now
CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --loop uvloop --http httptools --proxy-headers --forwarded-allow-ips '*'
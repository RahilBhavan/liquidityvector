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
# Stage 2: Final Runner (Minimal)
# ============================================
FROM python:3.11-alpine

WORKDIR /app

# Install runtime-only dependencies
# libgcc and libstdc++ are required for native extensions like uvloop
RUN apk add --no-cache curl libgcc libstdc++

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

# Respect Railway's dynamic port
EXPOSE 8000

# Start uvicorn with performance-optimized workers and proxy support
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --loop uvloop --http httptools --proxy-headers --forwarded-allow-ips '*' --timeout-keep-alive 65" ]

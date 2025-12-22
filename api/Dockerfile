# ============================================ 
# Stage 1: Builder
# ============================================ 
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies for native extensions
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

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy installed dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONPATH=/app

# Optimization env vars
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random

# Copy the backend code and the core logic
# (Assuming build context is set to the project root)
COPY api/ ./api
COPY core/ ./core

# Fix permissions
RUN chown -R appuser:appuser /app

USER appuser

# Expose FastAPI port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start uvicorn
# We run as a module so it finds 'api.main' correctly
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]
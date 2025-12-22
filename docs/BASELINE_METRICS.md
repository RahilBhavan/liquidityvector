# Technical Specification: Baseline Metrics

## Overview
This document records the baseline operational metrics for the Liquidity Vector system as of December 20, 2025. These values serve as the reference point for future performance optimization and regression testing.

## 1. Service Health
Standard health check response verifying circuit breaker status and semantic versioning.
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

## 2. Resource Utilization (Process Baseline)
Backend process footprint under idle state on a macOS/Darwin environment.
- **Process**: /opt/anaconda3/bin/uvicorn api.main:app
- **CPU Usage**: 0.4%
- **Memory Usage**: 0.1% (RSS: 22,560 KB)

## 3. Network Configuration
Verification of active listener ports for internal and external communication.
- **Port 8000**: API Service (LISTEN)
- **Protocol**: TCP IPv4
- **Interface**: Wildcard (*)
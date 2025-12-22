# Operational Specification: Rollback Procedure

## Overview
This document outlines the emergency procedures for reverting the Liquidity Vector system to a stable state in the event of a critical production failure.

## 1. Application Logic Reversion

### Trigger
Critical regression in financial calculation models or frontend state corruption.

### Procedure
1. **Identify Stable Release**: Locate the most recent stable Git tag (e.g., `v1.1.0`).
2. **Revert Working Branch**:
```bash
git checkout main
git reset --hard v1.1.0
git push origin main --force
```
3. **Verify Deployment**: Monitor the CI/CD pipeline to ensure the build and test stages complete successfully.

## 2. Infrastructure Reversion

### Trigger
Misconfiguration of environment variables, Docker image corruption, or networking failures.

### Procedure
1. **Container Re-deployment**: Manually pull the previous stable image from the registry.
```bash
docker pull ghcr.io/your-org/liquidityvector-api:v1.1.0
docker-compose -f docker-compose.prod.yml up -d
```
2. **Environment Variable Audit**: Revert all recent changes to the `.env` configuration file and restart services.

## 3. Data Integrity & Verification
Following any rollback, the following verification steps must be executed:
1. **Health Check**: Validate system state via `GET /health`.
2. **Integration Verification**: Execute a sample `POST /analyze` request to ensure gas and yield data aggregation is functional.
3. **Log Audit**: Review centralized logging for persistent 5xx errors.
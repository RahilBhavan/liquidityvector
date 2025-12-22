# Operational Specification: System Verification

## Overview
This document specifies the validation procedures for confirming the integrity of a new deployment. These tests must be executed following every production update.

## 1. Alerting Pipeline Verification
Verify that critical service errors are correctly propagated through the logging and alerting system.
```bash
curl -X GET https://api.yourdomain.com/debug/test-alert
```
**Success Criteria**: Receipt of a critical event notification in the configured monitoring channel containing the string "ALERT_VERIFICATION_TEST".

## 2. Calculation Engine Integrity
Verify the deterministic output of the Breakeven Engine via a controlled request.
```bash
curl -X POST -H "Content-Type: application/json" \
     -d '{"capital": 1000, "current_chain": "Ethereum", "target_chain": "Arbitrum", "pool_apy": 10.0}' \
     https://api.yourdomain.com/analyze
```
**Success Criteria**: JSON response containing valid numerical values for `breakeven_hours` and `total_cost`.

## 3. Container Integrity Verification
Validate that the latest build artifacts are correctly tagged and stored in the container registry.
```bash
# Example verification for API container
docker build -t ghcr.io/your-org/liquidityvector-api:v1.2.0 api/
```
**Success Criteria**: Successful image build and presence of the `v1.2.0` tag in the local image list.
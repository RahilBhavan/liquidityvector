# Operational Verification Guide

This guide provides commands to implement and verify the final deployment readiness steps.

## 1. Configure GitHub Secrets (CRITICAL)

Run these commands using the `gh` CLI to securely inject secrets into your repository for the CI/CD pipeline.

```bash
# Set Gemini API Key
gh secret set NEXT_PUBLIC_GEMINI_API_KEY --body "YOUR_ACTUAL_KEY_HERE"

# Set WalletConnect Project ID
gh secret set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID --body "YOUR_PROJECT_ID_HERE"

# Set Registry Credentials (if using Docker Hub/GHCR)
gh secret set DOCKER_USERNAME --body "your-username"
gh secret set DOCKER_PASSWORD --body "your-token-or-password"
```

## 2. Verify Alerting (HIGH)

Once deployed, call the diagnostic endpoint to verify that your monitoring system (e.g., CloudWatch, Sentry, Datadog) triggers an alert.

```bash
# Trigger a critical log event
curl -X GET https://api.yourdomain.com/debug/test-alert
```

**Verification:** Check your Slack/Email/PagerDuty for a notification containing "ALERT_VERIFICATION_TEST".

## 3. Manual Image Push (HIGH)

If the automated CI push is not yet configured, use these commands to push the backend image to your registry.

```bash
# Authenticate (example for GHCR)
echo $CR_PAT | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Build and Tag
docker build -t ghcr.io/your-org/liquidityvector-api:v1.1.0 api/

# Push
docker push ghcr.io/your-org/liquidityvector-api:v1.1.0
```

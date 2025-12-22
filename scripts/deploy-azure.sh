#!/bin/bash
# ============================================================
# Azure Deployment Script for Liquidity Vector
# ============================================================
# Usage: ./scripts/deploy-azure.sh [staging|production]
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Docker installed and running
#   - Environment variables set (see .env.example)
# ============================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
RESOURCE_GROUP="liquidityvector-${ENVIRONMENT}-rg"
LOCATION="eastus"
ACR_NAME="liquidityvector${ENVIRONMENT}acr"
CONTAINER_ENV="liquidityvector-${ENVIRONMENT}-env"
API_APP_NAME="liquidityvector-api-${ENVIRONMENT}"
WEB_APP_NAME="liquidityvector-web-${ENVIRONMENT}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Liquidity Vector Azure Deployment${NC}"
echo -e "${BLUE}Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "${BLUE}============================================${NC}"

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v az &> /dev/null; then
    echo -e "${RED}Error: Azure CLI not installed${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker not installed${NC}"
    exit 1
fi

if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged into Azure. Run 'az login' first.${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites OK${NC}"

# Check required environment variables
echo -e "\n${YELLOW}Checking environment variables...${NC}"

REQUIRED_VARS=(
    "NEXT_PUBLIC_GEMINI_API_KEY"
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: $var is not set${NC}"
        exit 1
    fi
done

echo -e "${GREEN}Environment variables OK${NC}"

# Create Resource Group
echo -e "\n${YELLOW}Creating resource group...${NC}"
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output none
echo -e "${GREEN}Resource group created: $RESOURCE_GROUP${NC}"

# Create Azure Container Registry
echo -e "\n${YELLOW}Creating container registry...${NC}"
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $ACR_NAME \
    --sku Basic \
    --admin-enabled true \
    --output none
echo -e "${GREEN}Container registry created: $ACR_NAME${NC}"

# Get ACR credentials
ACR_URL=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# Login to ACR
echo -e "\n${YELLOW}Logging into container registry...${NC}"
az acr login --name $ACR_NAME
echo -e "${GREEN}Logged into ACR${NC}"

# Build and push API image
echo -e "\n${YELLOW}Building API image...${NC}"
docker build -t $ACR_URL/liquidityvector-api:latest ./api
docker push $ACR_URL/liquidityvector-api:latest
echo -e "${GREEN}API image pushed${NC}"

# Build and push Web image
echo -e "\n${YELLOW}Building Web image...${NC}"
docker build \
    -f Dockerfile.frontend \
    --build-arg NEXT_PUBLIC_BACKEND_URL="https://${API_APP_NAME}.${LOCATION}.azurecontainerapps.io" \
    --build-arg NEXT_PUBLIC_API_BASE_URL="/api/backend" \
    --build-arg NEXT_PUBLIC_GEMINI_API_KEY="$NEXT_PUBLIC_GEMINI_API_KEY" \
    --build-arg NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" \
    -t $ACR_URL/liquidityvector-web:latest .
docker push $ACR_URL/liquidityvector-web:latest
echo -e "${GREEN}Web image pushed${NC}"

# Create Container Apps Environment
echo -e "\n${YELLOW}Creating Container Apps environment...${NC}"
az containerapp env create \
    --name $CONTAINER_ENV \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --output none
echo -e "${GREEN}Container Apps environment created${NC}"

# Deploy API Container App
echo -e "\n${YELLOW}Deploying API...${NC}"
az containerapp create \
    --name $API_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $CONTAINER_ENV \
    --image $ACR_URL/liquidityvector-api:latest \
    --registry-server $ACR_URL \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --target-port 8000 \
    --ingress external \
    --min-replicas 1 \
    --max-replicas 5 \
    --cpu 0.5 \
    --memory 1.0Gi \
    --env-vars \
        ENVIRONMENT=production \
        ALLOWED_ORIGINS="https://${WEB_APP_NAME}.${LOCATION}.azurecontainerapps.io" \
    --output none

API_URL=$(az containerapp show --name $API_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
echo -e "${GREEN}API deployed: https://$API_URL${NC}"

# Deploy Web Container App
echo -e "\n${YELLOW}Deploying Web...${NC}"
az containerapp create \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $CONTAINER_ENV \
    --image $ACR_URL/liquidityvector-web:latest \
    --registry-server $ACR_URL \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --target-port 3000 \
    --ingress external \
    --min-replicas 1 \
    --max-replicas 3 \
    --cpu 0.5 \
    --memory 1.0Gi \
    --output none

WEB_URL=$(az containerapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
echo -e "${GREEN}Web deployed: https://$WEB_URL${NC}"

# Update API CORS with actual web URL
echo -e "\n${YELLOW}Updating API CORS settings...${NC}"
az containerapp update \
    --name $API_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --set-env-vars ALLOWED_ORIGINS="https://$WEB_URL" \
    --output none
echo -e "${GREEN}CORS updated${NC}"

# Health checks
echo -e "\n${YELLOW}Running health checks...${NC}"
sleep 30

API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://$API_URL/health" || echo "000")
if [ "$API_HEALTH" = "200" ]; then
    echo -e "${GREEN}API health check passed${NC}"
else
    echo -e "${RED}API health check failed (HTTP $API_HEALTH)${NC}"
fi

WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://$WEB_URL" || echo "000")
if [ "$WEB_HEALTH" = "200" ]; then
    echo -e "${GREEN}Web health check passed${NC}"
else
    echo -e "${RED}Web health check failed (HTTP $WEB_HEALTH)${NC}"
fi

# Summary
echo -e "\n${BLUE}============================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "API URL: ${YELLOW}https://$API_URL${NC}"
echo -e "Web URL: ${YELLOW}https://$WEB_URL${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "\nTo delete all resources:"
echo -e "  ${YELLOW}az group delete --name $RESOURCE_GROUP --yes${NC}"

#!/bin/bash
set -e

# Get the absolute path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Starting Liquidity Vector Backend..."

# Navigate to api directory
cd "$PROJECT_ROOT/api"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running. Please start Docker Desktop."
  exit 1
fi

# Run Docker Compose
echo "📦 Building and starting containers..."
docker-compose up -d --build

echo ""
echo "✅ Backend Service Started Successfully!"
echo "----------------------------------------"
echo "📡 Health Check: http://localhost:8000/health"
echo "📚 API Docs:     http://localhost:8000/docs"
echo "----------------------------------------"
echo "To view logs:    cd api && docker-compose logs -f"
echo "To stop:         cd api && docker-compose down"

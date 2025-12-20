#!/bin/bash
set -e

# Get the absolute path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Initializing Liquidity Vector..."
echo "---------------------------------"

# --- BACKEND ---
echo "🐳 Starting Backend (Docker)..."

# Navigate to api directory
cd "$PROJECT_ROOT/api"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running. Please start Docker Desktop."
  exit 1
fi

# Run Docker Compose
docker-compose up -d --build

echo "✅ Backend running at http://localhost:8000"

# --- FRONTEND ---
echo "---------------------------------"
echo "⚛️  Starting Frontend (Next.js)..."

# Navigate back to project root
cd "$PROJECT_ROOT"

# Check for node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo "⚠️  No .env.local found. Creating from .env.example..."
    cp .env.example .env.local
fi

echo "✨ Server starting at http://localhost:3000"
echo "   (Press Ctrl+C to stop the frontend)"
echo "---------------------------------"

npm run dev
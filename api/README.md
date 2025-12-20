# Liquidity Vector API

This is the backend for Liquidity Vector, a DeFi route analysis and yield optimization engine.

## 🚀 Deployment

The application is containerized using Docker.

### Prerequisites

- Docker
- Docker Compose

### Running Locally (Docker)

To run the API locally with hot-reloading enabled:

```bash
cd api
docker-compose up --build
```

The API will be available at `http://localhost:8000`.

### Production Build

To build the production image:

```bash
docker build -t liquidityvector-api .
```

Run the container:

```bash
docker run -d -p 8000:8000 --env-file .env liquidityvector-api
```

## 🧪 Testing

The project uses `pytest` for testing.

### Running Tests

1. Install test dependencies:
   ```bash
   pip install -r requirements-dev.txt
   ```

2. Run tests:
   ```bash
   pytest
   ```

## ⚙️ Configuration

Configuration is managed via environment variables and `api/config.py`.

### Environment Variables

| Variable | Description | Default | Required in Prod |
|----------|-------------|---------|------------------|
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins. | `[]` | Yes |
| `ENVIRONMENT` | Application environment (`development`, `production`). | `development` | Yes |
| `DEFILLAMA_API_KEY` | API Key for DefiLlama (if applicable). | `""` | No |

### Production Security

In `production` environment:
- `ALLOWED_ORIGINS` **MUST** be set and cannot be `*`.
- The application will log warnings or errors if insecure configurations are detected at startup.

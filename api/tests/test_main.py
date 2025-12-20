from fastapi.testclient import TestClient
from api.main import app

def test_health_check(client: TestClient):
    """
    Test the health check endpoint.
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "circuits" in data

def test_config_validation():
    """
    Test that the settings are loaded correctly.
    """
    from api.config import settings
    # Ensure default environment is development or set via env
    assert settings.ENVIRONMENT in ["development", "production"]

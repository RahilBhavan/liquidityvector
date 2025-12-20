import pytest
from fastapi.testclient import TestClient
from api.main import app

@pytest.fixture
def client():
    """
    Fixture to provide a TestClient instance for the FastAPI app.
    """
    with TestClient(app) as client:
        yield client

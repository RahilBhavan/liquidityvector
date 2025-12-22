import sys
from pathlib import Path

# Add parent directory to Python path so we can import 'api' module
# This handles both running from root and from api/ directory
root_dir = Path(__file__).parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

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

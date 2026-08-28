import sys
import os
from fastapi.testclient import TestClient

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app

client = TestClient(app)

def test_app_instance():
    """Verify FastAPI application initializes correctly."""
    assert app.title == "AI ATS FastAPI Backend"
    assert app.version == "1.0.0"

def test_health_endpoint_response():
    """Verify GET /api/health endpoint structure."""
    response = client.get("/api/health")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "database" in data

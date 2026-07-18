from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def test_liveness_does_not_require_database():
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json()["scope"] == "liveness"


def test_readiness_reports_missing_database_without_details(monkeypatch):
    monkeypatch.setattr(settings, "DATABASE_URL", "")
    response = TestClient(app).get("/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable", "database": "not_configured"}

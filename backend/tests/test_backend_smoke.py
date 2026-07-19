from fastapi.testclient import TestClient

from app.core.config import BACKEND_DIRECTORY, Settings, settings
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


def test_environment_files_are_resolved_independently_of_launch_directory():
    assert Settings.model_config["env_file"] == BACKEND_DIRECTORY / ".env"


def test_backend_environment_example_matches_settings_contract():
    example_keys = {
        line.split("=", 1)[0].strip()
        for line in (BACKEND_DIRECTORY / ".env.example").read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    }
    assert example_keys == set(Settings.model_fields)
    assert not any(key.startswith("VITE_") for key in example_keys)

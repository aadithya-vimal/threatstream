from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.domains.scans.service import ScansService
from app.main import app


ORIGINS = ("http://localhost:5173", "http://127.0.0.1:5173")
WORKSPACE_ID = uuid4()
HEALTH_PATH = f"/api/v1/workspaces/{WORKSPACE_ID}/scanners/nuclei/health"


def scanner_route():
    return next(route for route in app.routes if getattr(route, "path", "").endswith("/scanners/{scanner_type}/health"))


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def override_scanner_dependencies():
    route = scanner_route()
    for dependency in route.dependant.dependencies:
        if dependency.name == "user":
            app.dependency_overrides[dependency.call] = lambda: SimpleNamespace(user_id=uuid4())
        elif dependency.name == "session":
            app.dependency_overrides[dependency.call] = lambda: SimpleNamespace()


@pytest.mark.parametrize("origin", ORIGINS)
def test_local_development_origins_receive_cors_headers(origin):
    response = TestClient(app).get("/health", headers={"Origin": origin})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["access-control-allow-credentials"] == "true"


def test_scanner_health_preflight_allows_auth_and_workspace_headers():
    response = TestClient(app).options(HEALTH_PATH, headers={
        "Origin": ORIGINS[0],
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type,x-workspace-id",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGINS[0]
    allowed_headers = response.headers["access-control-allow-headers"].lower()
    assert "authorization" in allowed_headers and "x-workspace-id" in allowed_headers


def test_unauthorized_scanner_health_is_structured_and_cors_enabled():
    response = TestClient(app).get(HEALTH_PATH, headers={"Origin": ORIGINS[0]})
    assert response.status_code == 401
    assert response.headers["access-control-allow-origin"] == ORIGINS[0]
    assert response.json()["error"]["code"] == "authentication_required"


def test_authenticated_scanner_unavailable_is_truthful(monkeypatch):
    override_scanner_dependencies()

    async def unavailable(_self, scanner_type):
        return {"scanner_type": scanner_type, "available": False, "configured": True, "binary_detected": False, "version": None, "message": "Nuclei CLI is not installed or not reachable"}

    monkeypatch.setattr(ScansService, "health", unavailable)
    response = TestClient(app).get(HEALTH_PATH, headers={"Origin": ORIGINS[0]})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGINS[0]
    assert response.json() == {
        "scanner_type": "nuclei",
        "available": False,
        "configured": True,
        "binary_detected": False,
        "version": None,
        "message": "Nuclei CLI is not installed or not reachable",
    }


def test_scanner_health_internal_failure_is_sanitized_and_cors_enabled(monkeypatch):
    override_scanner_dependencies()

    async def fail(_self, _scanner_type):
        raise RuntimeError("sensitive subprocess detail")

    monkeypatch.setattr(ScansService, "health", fail)
    response = TestClient(app, raise_server_exceptions=False).get(HEALTH_PATH, headers={"Origin": ORIGINS[0]})
    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == ORIGINS[0]
    assert response.json()["error"]["message"] == "An unexpected error occurred"
    assert "sensitive" not in response.text


def test_wrong_workspace_header_is_denied_with_cors():
    route = scanner_route()
    user_dependency = next(item for item in route.dependant.dependencies if item.name == "user")
    nested = {item.name: item.call for item in user_dependency.dependencies}
    app.dependency_overrides[nested["user"]] = lambda: SimpleNamespace(user_id=uuid4())
    app.dependency_overrides[nested["session"]] = lambda: SimpleNamespace()

    response = TestClient(app).get(HEALTH_PATH, headers={
        "Origin": ORIGINS[0],
        "X-Workspace-ID": str(uuid4()),
    })
    assert response.status_code == 403
    assert response.headers["access-control-allow-origin"] == ORIGINS[0]
    assert response.json()["error"]["code"] == "permission_denied"

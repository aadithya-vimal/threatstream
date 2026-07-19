import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.domains.findings.schemas import CommentCreate, EvidenceCreate, FindingCreate, FindingTransition, FindingUpdate
from app.domains.findings.service import FindingsService, TRANSITIONS
from app.main import app


class Transaction:
    async def __aenter__(self): return self
    async def __aexit__(self, *_args): return None


class FakeSession:
    def begin(self): return Transaction()
    async def delete(self, _row): return None


def principal():
    return SimpleNamespace(user_id=uuid4(), email="analyst@example.test", display_name="Analyst")


def finding(workspace_id=None, **overrides):
    values = dict(
        id=uuid4(), organization_id=uuid4(), workspace_id=workspace_id or uuid4(),
        title="SQL injection in account search", description="Untrusted input reaches a SQL query.",
        severity="high", status="open", source="manual", external_id=None,
        remediation=None, resolution_summary=None, assignee_user_id=None, version=1,
        created_at=datetime.now(UTC), updated_at=datetime.now(UTC),
        acknowledged_at=None, started_at=None, resolved_at=None, closed_at=None, reopened_at=None,
    )
    values.update(overrides)
    return SimpleNamespace(**values)


class FakeRepository:
    def __init__(self, row):
        self.row = row
        self.activity = []
        self.audit = []

    async def get_finding(self, workspace_id, finding_id, **_kwargs):
        return self.row if self.row.workspace_id == workspace_id and self.row.id == finding_id else None

    async def get_assignee(self, *_args): return None

    async def add_activity(self, _finding, _actor, action, **values):
        self.activity.append((action, values))

    async def add_audit(self, _finding, _actor, action, **values):
        self.audit.append((action, values))

    def touch(self, row, actor_id):
        row.updated_by = actor_id
        row.updated_at = datetime.now(UTC)
        row.version += 1


def service_with(row):
    service = FindingsService(FakeSession(), principal())
    service.repository = FakeRepository(row)
    return service


def test_findings_routes_cover_crud_lifecycle_comments_and_evidence():
    methods = {}
    for route in app.routes:
        if "findings" in getattr(route, "path", ""):
            methods.setdefault(route.path, set()).update(route.methods)
    base = "/api/v1/workspaces/{workspace_id}/findings"
    detail = f"{base}/{{finding_id}}"
    assert methods[base] == {"GET", "POST"}
    assert {"GET", "PATCH", "DELETE"}.issubset(methods[detail])
    assert methods[f"{detail}/transitions"] == {"POST"}
    assert methods[f"{detail}/comments"] == {"POST"}
    assert methods[f"{detail}/evidence"] == {"POST"}
    assert methods[f"{detail}/evidence/{{evidence_id}}"] == {"DELETE"}


def test_schemas_reject_extras_bad_evidence_urls_and_empty_updates():
    with pytest.raises(Exception):
        FindingCreate(title="Valid title", description="Valid description", severity="high", secret="nope")
    with pytest.raises(Exception):
        EvidenceCreate(version=1, kind="url", title="Ticket", content="javascript:alert(1)")
    with pytest.raises(Exception):
        FindingUpdate(version=1)


def test_status_graph_covers_every_required_state_and_only_reopens_terminal_states():
    assert set(TRANSITIONS) == {"open", "acknowledged", "in_progress", "resolved", "closed", "reopened"}
    assert "reopened" not in TRANSITIONS["open"]
    assert "reopened" in TRANSITIONS["resolved"] and "reopened" in TRANSITIONS["closed"]


@pytest.mark.parametrize("next_status", ["acknowledged", "in_progress", "resolved", "closed"])
def test_state_changes_increment_version_and_write_activity_and_audit(next_status):
    row = finding(resolution_summary="Fixed and verified" if next_status in {"resolved", "closed"} else None)
    service = service_with(row)
    result = asyncio.run(service.transition(row.workspace_id, row.id, FindingTransition(version=1, status=next_status)))
    assert result["status"] == next_status
    assert result["version"] == 2
    assert service.repository.activity[0][0] == "finding.status_changed"
    assert service.repository.audit[0][0] == "finding.status_changed"


def test_invalid_transition_and_stale_version_are_rejected():
    row = finding(status="closed", version=4)
    service = service_with(row)
    with pytest.raises(HTTPException) as stale:
        asyncio.run(service.transition(row.workspace_id, row.id, FindingTransition(version=3, status="reopened", note="Regression")))
    assert stale.value.status_code == 409
    row.version = 4
    with pytest.raises(HTTPException) as invalid:
        asyncio.run(service.transition(row.workspace_id, row.id, FindingTransition(version=4, status="acknowledged")))
    assert invalid.value.status_code == 422


def test_cross_workspace_detail_is_not_found():
    row = finding()
    service = service_with(row)
    with pytest.raises(HTTPException) as missing:
        asyncio.run(service.detail(uuid4(), row.id))
    assert missing.value.status_code == 404


def test_update_requires_active_workspace_assignee_and_is_audited():
    row = finding()
    service = service_with(row)
    unknown = uuid4()
    with pytest.raises(HTTPException) as invalid:
        asyncio.run(service.update(row.workspace_id, row.id, FindingUpdate(version=1, assignee_user_id=unknown)))
    assert invalid.value.status_code == 422
    result = asyncio.run(service.update(row.workspace_id, row.id, FindingUpdate(version=1, title="Updated SQL injection finding")))
    assert result["title"] == "Updated SQL injection finding"
    assert result["version"] == 2
    assert service.repository.audit[0][0] == "finding.updated"

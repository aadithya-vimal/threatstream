import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.domains.scans.adapters import scanner_registry
from app.domains.scans.adapters.base import ExecutionTarget, ScannerExecutionError
from app.domains.scans.adapters.nuclei import MAX_OUTPUT, NucleiAdapter, NucleiConfiguration
from app.main import app
from app.database.models import FindingOccurrence, RawScanResult, ScanJob
from app.database.repositories import ScansRepository
from app.domains.scans.orchestrator import retry_delay, transition_job
from app.domains.scans.scheduler import cron_trigger, next_run, validate_schedule_shape
from app.domains.scans.schemas import ScanScheduleCreate, ScanScheduleUpdate


def target(asset_type="domain", value="example.test"):
    return ExecutionTarget(uuid4(), uuid4(), uuid4(), asset_type, value)


def test_registry_exposes_only_nuclei_as_active():
    definitions = {item.scanner_type: item for item in scanner_registry.definitions()}
    assert definitions["nuclei"].active
    assert all(not definitions[name].active for name in ("trivy", "nmap", "semgrep", "gitleaks", "zap", "custom"))


@pytest.mark.parametrize("scanner", ["trivy", "unknown", "custom"])
def test_registry_rejects_unknown_or_inactive_scanners(scanner):
    with pytest.raises(ValueError): scanner_registry.resolve(scanner)


def test_profile_configuration_rejects_unknown_keys_and_unsafe_values():
    with pytest.raises(ValidationError): NucleiConfiguration.model_validate({"arbitrary_flags": ["-debug"]})
    with pytest.raises(ValidationError): NucleiConfiguration.model_validate({"tags": ["safe; whoami"]})
    with pytest.raises(ValidationError): NucleiConfiguration.model_validate({"rate_limit": 1001})


def test_profile_configuration_normalizes_duplicates():
    value = NucleiAdapter().validate_profile({"severities": ["HIGH", "high"], "tags": ["cve", "cve"]})
    assert value["severities"] == ["high"] and value["tags"] == ["cve"]


def test_unsupported_asset_is_rejected_before_execution():
    with pytest.raises(ValueError): NucleiAdapter().validate_asset("repository")


def test_execution_plan_is_argument_array_with_allowlisted_options():
    args = NucleiAdapter().build_execution_plan(target("url", "https://example.test/path"), {"tags": ["cve"], "rate_limit": 10})
    assert args[:5] == ["nuclei", "-jsonl", "-target", "https://example.test/path", "-no-color"]
    assert "-tags" in args and "cve" in args and ";" not in " ".join(args)


def test_jsonl_parser_skips_malformed_lines_and_redacts_secrets():
    output = b'{"template-id":"x","authorization":"Bearer secret"}\nnot json\n[]\n'
    records = NucleiAdapter().parse_output(output)
    assert len(records) == 1 and records[0]["authorization"] == "[REDACTED]"


def test_parser_enforces_output_limit():
    with pytest.raises(ScannerExecutionError): NucleiAdapter().parse_output(b"x" * (MAX_OUTPUT + 1))


def test_normalization_is_stable_and_workspace_asset_scoped():
    adapter = NucleiAdapter(); workspace = uuid4(); execution = target()
    payload = {"template-id": "tls-version", "matcher-name": "tls", "matched-at": "example.test:443", "info": {"name": "Old TLS", "severity": "high"}}
    first = adapter.normalize_result(workspace, execution, payload)
    second = adapter.normalize_result(workspace, execution, json.loads(json.dumps(payload)))
    assert first.fingerprint == second.fingerprint and len(first.fingerprint) == 64 and first.severity == "high"
    assert adapter.normalize_result(uuid4(), execution, payload).fingerprint != first.fingerprint


def test_normalization_bounds_evidence_and_maps_info_severity():
    result = NucleiAdapter().normalize_result(uuid4(), target(), {"template-id": "x", "info": {"severity": "info"}, "extracted-results": list(map(str, range(30)))})
    assert result.severity == "informational" and len(result.evidence_summary["extracted_results"]) == 20


def test_health_reports_unavailable_without_startup_failure(monkeypatch):
    async def missing(*_args, **_kwargs): raise FileNotFoundError
    monkeypatch.setattr(asyncio, "create_subprocess_exec", missing)
    assert asyncio.run(NucleiAdapter().health_check()) == {"available": False, "version": None, "message": "Nuclei CLI is not installed or not reachable"}


def test_cancel_terminates_only_registered_job_process():
    adapter = NucleiAdapter(); job_id = uuid4(); proc = SimpleNamespace(terminate=lambda: setattr(proc, "terminated", True), terminated=False)
    adapter._processes[job_id] = proc
    assert asyncio.run(adapter.cancel(job_id)) and proc.terminated
    assert not asyncio.run(adapter.cancel(uuid4()))


def test_scan_openapi_routes_and_bounded_job_pagination():
    schema = app.openapi(); base = "/api/v1/workspaces/{workspace_id}"
    expected = [f"{base}/scanners", f"{base}/scanners/{{scanner_type}}/health", f"{base}/scan-profiles", f"{base}/scan-profiles/{{profile_id}}/run", f"{base}/scan-jobs", f"{base}/scan-jobs/{{job_id}}/results"]
    assert all(path in schema["paths"] for path in expected)
    page_size = next(item for item in schema["paths"][f"{base}/scan-jobs"]["get"]["parameters"] if item["name"] == "page_size")
    assert page_size["schema"]["maximum"] == 100


def test_raw_result_api_schema_never_exposes_payload_json():
    properties = app.openapi()["components"]["schemas"]["SafeRawResult"]["properties"]
    assert "payload_json" not in properties and "summary" in properties


def test_job_lifecycle_rejects_invalid_transition():
    row = SimpleNamespace(status="queued", version=1)
    transition_job(row, "claimed")
    assert row.status == "claimed" and row.version == 2
    with pytest.raises(ValueError): transition_job(row, "completed")


@pytest.mark.parametrize("attempt,minimum,maximum", [(1, 15, 16), (2, 60, 66), (3, 300, 300), (99, 300, 300)])
def test_retry_backoff_is_bounded(attempt, minimum, maximum):
    seconds = retry_delay(attempt).total_seconds()
    assert minimum <= seconds <= maximum


def test_schedule_validation_accepts_interval_and_timezone_aware_cron():
    interval = ScanScheduleCreate(profile_id=uuid4(), name="Daily perimeter", schedule_type="interval", interval_minutes=60)
    assert next_run(interval.schedule_type, interval.interval_minutes, None, "UTC").tzinfo is not None
    assert cron_trigger("0 9 * * 1-5", "Asia/Kolkata") is not None


@pytest.mark.parametrize("expression", ["@hourly", "* * * * *", "bad cron", "0 0 0 * * *"])
def test_schedule_validation_rejects_macros_too_frequent_and_invalid_cron(expression):
    with pytest.raises(ValueError): cron_trigger(expression, "UTC")


def test_schedule_validation_rejects_invalid_timezone_and_mixed_shape():
    with pytest.raises(ValueError): validate_schedule_shape("interval", 30, "0 * * * *", "UTC")
    with pytest.raises(ValueError): validate_schedule_shape("cron", None, "0 * * * *", "Mars/Olympus")
    with pytest.raises(ValidationError): ScanScheduleUpdate(version=1)


def test_durable_scan_openapi_exposes_schedules_and_never_exposes_claim_tokens():
    schema = app.openapi(); base = "/api/v1/workspaces/{workspace_id}"
    assert f"{base}/scan-worker/status" in schema["paths"]
    assert f"{base}/scan-schedules" in schema["paths"]
    assert f"{base}/scan-schedules/{{schedule_id}}/enable" in schema["paths"]
    properties = schema["components"]["schemas"]["ScanJobSummary"]["properties"]
    assert "claim_token" not in properties and "worker_id" not in properties


def test_scan_run_endpoint_has_no_fastapi_background_task_parameter():
    route = next(route for route in app.routes if getattr(route, "path", "").endswith("/scan-profiles/{profile_id}/run"))
    dependency_names = {field.name for field in route.dependant.body_params + route.dependant.query_params}
    assert "background_tasks" not in dependency_names


def test_repository_claim_uses_skip_locked_random_token_and_does_not_increment_attempts():
    class Session:
        def __init__(self): self.query = None
        async def scalar(self, query): self.query = query; return row
        async def flush(self): pass
    row = SimpleNamespace(status="queued", claim_token=None, worker_id=None, claimed_by=None, claimed_at=None, heartbeat_at=None, lease_expires_at=None, version=1, attempt_count=0)
    session = Session(); claimed = asyncio.run(ScansRepository(session).claim_next("worker-a", 90))
    assert claimed is row and row.status == "claimed" and row.worker_id == "worker-a"
    assert row.claim_token and len(row.claim_token) >= 32 and row.attempt_count == 0
    assert session.query._for_update_arg.skip_locked is True


def test_heartbeat_requires_current_claim_and_renews_lease():
    repo = ScansRepository(SimpleNamespace())
    repo.claimed_job = AsyncMock(return_value=None)
    assert asyncio.run(repo.heartbeat(uuid4(), "worker-a", "stale-token", 90)) is None
    row = SimpleNamespace(lease_expires_at=None, heartbeat_at=None)
    repo.claimed_job = AsyncMock(return_value=row)
    renewed = asyncio.run(repo.heartbeat(uuid4(), "worker-a", "valid-token", 90))
    assert renewed is row and row.heartbeat_at is not None and row.lease_expires_at > row.heartbeat_at
    repo.claimed_job.assert_awaited_once()


def test_database_constraints_protect_retry_ingestion_and_schedule_occurrences():
    raw_uniques = {tuple(constraint.columns.keys()) for constraint in RawScanResult.__table__.constraints if constraint.__class__.__name__ == "UniqueConstraint"}
    occurrence_uniques = {tuple(constraint.columns.keys()) for constraint in FindingOccurrence.__table__.constraints if constraint.__class__.__name__ == "UniqueConstraint"}
    job_uniques = {tuple(constraint.columns.keys()) for constraint in ScanJob.__table__.constraints if constraint.__class__.__name__ == "UniqueConstraint"}
    assert ("job_target_id", "payload_hash") in raw_uniques
    assert ("raw_result_id",) in occurrence_uniques
    assert ("schedule_id", "scheduled_for") in job_uniques
    assert any(index.unique and index.name == "uq_scan_jobs_active_profile" for index in ScanJob.__table__.indexes)

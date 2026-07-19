import asyncio
import json
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.domains.scans.adapters import scanner_registry
from app.domains.scans.adapters.base import ExecutionTarget, ScannerExecutionError
from app.domains.scans.adapters.nuclei import MAX_OUTPUT, NucleiAdapter, NucleiConfiguration
from app.main import app
from app.domains.scans.orchestrator import transition_job


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

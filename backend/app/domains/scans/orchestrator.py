import json
import logging
import socket
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select

from app.database.models import (
    AuditEvent,
    Finding,
    FindingActivity,
    FindingOccurrence,
    RawScanResult,
    ScanJobTarget,
)
from app.database.repositories import ScansRepository
from app.database.session import get_session_factory
from app.domains.assets.metadata import redact_metadata
from app.domains.scans.adapters import scanner_registry
from app.domains.scans.adapters.base import ExecutionTarget, ScannerExecutionError, ScannerUnavailableError

logger = logging.getLogger("threatstream.scans")
MAX_RAW_PAYLOAD = 128 * 1024
JOB_TRANSITIONS = {
    "queued": {"claimed", "cancelled"},
    "claimed": {"running", "failed", "cancelled"},
    "running": {"processing", "failed", "cancelled"},
    "processing": {"completed", "failed"},
    "completed": set(), "failed": set(), "cancelled": set(),
}


def transition_job(job, next_status: str) -> None:
    if next_status not in JOB_TRANSITIONS.get(job.status, set()):
        raise ValueError(f"Invalid scan job transition: {job.status} to {next_status}")
    job.status = next_status
    job.version += 1


def safe_error(code: str) -> str:
    return {
        "scanner_unavailable": "Scanner is unavailable",
        "execution_timeout": "Scanner execution timed out",
        "output_limit": "Scanner output exceeded safety limits",
        "execution_failed": "Scanner execution failed",
        "processing_failed": "Scan processing failed",
    }.get(code, "Scan processing failed")


async def _audit(repo, row, action: str, summary: dict | None = None) -> None:
    await repo.add_audit(row, row.requested_by, action, "scan_job", summary)


async def execute_scan_job(job_id: UUID, session_factory=None) -> None:
    """Claim and execute a queued job. Safe to call more than once for the same job."""
    factory = session_factory or get_session_factory()
    worker = f"in-process:{socket.gethostname()[:80]}"
    try:
        async with factory() as session:
            repo = ScansRepository(session)
            async with session.begin():
                job = await repo.claim(job_id, worker)
                if not job:
                    return
                await _audit(repo, job, "scan_job.claimed", {"worker": "in_process"})
                scanner_type = job.scanner_type
                workspace_id = job.workspace_id
                profile_id = job.profile_id

            adapter = scanner_registry.resolve(scanner_type)
            async with session.begin():
                job = await repo.job_any(job_id, True)
                if job.status == "cancelled":
                    return
                profile = await repo.profile(workspace_id, profile_id)
                targets = await repo.job_targets(job_id)
                configuration = dict(profile.configuration_json)
                target_ids = [target.id for target in targets]
                transition_job(job, "running")
                job.started_at = datetime.now(UTC)
                await _audit(repo, job, "scan_job.started", {"target_count": job.target_count})

            had_failure = False
            for target_id in target_ids:
                async with session.begin():
                    job = await repo.job_any(job_id, True)
                    if job.status == "cancelled":
                        break
                    target = await session.get(ScanJobTarget, target_id, with_for_update=True)
                    target.execution_status = "running"
                    target.started_at = datetime.now(UTC)
                    execution = ExecutionTarget(
                        job.id, target.id, target.asset_id, target.asset_type, target.normalized_target
                    )

                try:
                    payloads = await adapter.execute_target(execution, configuration)
                except (ScannerUnavailableError, ScannerExecutionError) as exc:
                    had_failure = True
                    code = "scanner_unavailable" if isinstance(exc, ScannerUnavailableError) else (
                        "execution_timeout" if "timed out" in str(exc).lower() else
                        "output_limit" if "limit" in str(exc).lower() else "execution_failed"
                    )
                    async with session.begin():
                        target = await session.get(ScanJobTarget, target_id, with_for_update=True)
                        target.execution_status = "failed"
                        target.completed_at = datetime.now(UTC)
                        target.error_summary = safe_error(code)
                        job = await repo.job_any(job_id, True)
                        job.processed_target_count += 1
                        job.failure_code = code
                        job.failure_message = safe_error(code)
                    continue

                async with session.begin():
                    job = await repo.job_any(job_id, True)
                    target = await session.get(ScanJobTarget, target_id, with_for_update=True)
                    persisted = 0
                    for payload in payloads:
                        payload = redact_metadata(payload)
                        encoded = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
                        if len(encoded) > MAX_RAW_PAYLOAD:
                            had_failure = True
                            continue
                        await repo.add_raw(
                            job, target, payload, adapter.definition.adapter_version, adapter.definition.parser_version
                        )
                        persisted += 1
                    target.execution_status = "completed"
                    target.completed_at = datetime.now(UTC)
                    target.result_count = persisted
                    job.raw_result_count += persisted
                    job.processed_target_count += 1

            async with session.begin():
                job = await repo.job_any(job_id, True)
                if job.status == "cancelled":
                    return
                transition_job(job, "processing")
                raw_ids = list(await session.scalars(select(RawScanResult.id).where(RawScanResult.job_id == job_id)))
                targets = await repo.job_targets(job_id)
                target_map = {target.id: target for target in targets}

            for raw_id in raw_ids:
                async with session.begin():
                    job = await repo.job_any(job_id, True)
                    raw = await session.get(RawScanResult, raw_id, with_for_update=True)
                    target = target_map[raw.job_target_id]
                    normalized = adapter.normalize_result(
                        job.workspace_id,
                        ExecutionTarget(job.id, target.id, target.asset_id, target.asset_type, target.normalized_target),
                        raw.payload_json,
                    )
                    finding = await repo.finding_by_fingerprint(job.workspace_id, normalized.fingerprint)
                    now = datetime.now(UTC)
                    if finding is None:
                        finding = Finding(
                            organization_id=job.organization_id,
                            workspace_id=job.workspace_id,
                            title=normalized.title,
                            description=normalized.description,
                            severity=normalized.severity,
                            status="open",
                            source=job.scanner_type,
                            external_id=normalized.template_id,
                            remediation=normalized.remediation,
                            asset_id=target.asset_id,
                            scanner_fingerprint=normalized.fingerprint,
                            scanner_type=job.scanner_type,
                            first_detected_at=now,
                            last_detected_at=now,
                            occurrence_count=1,
                            scanner_metadata=normalized.metadata,
                            created_by=job.requested_by,
                            updated_by=job.requested_by,
                        )
                        session.add(finding)
                        await session.flush()
                        outcome = "created"
                        action = "finding.created_from_scan"
                        job.findings_created_count += 1
                    else:
                        old_status = finding.status
                        severity_changed = finding.severity != normalized.severity
                        finding.last_detected_at = now
                        finding.occurrence_count += 1
                        finding.scanner_metadata = normalized.metadata
                        finding.severity = normalized.severity
                        finding.updated_at = now
                        finding.updated_by = job.requested_by
                        finding.version += 1
                        if old_status in {"resolved", "closed"}:
                            finding.status = "reopened"
                            finding.reopened_at = now
                            outcome = "reopened"
                            action = "finding.reopened_from_scan"
                            job.findings_reopened_count += 1
                        else:
                            outcome = "updated" if severity_changed else "unchanged"
                            action = "finding.updated_from_scan"
                            job.findings_updated_count += int(severity_changed)
                            job.findings_unchanged_count += int(not severity_changed)

                    session.add(FindingActivity(
                        organization_id=job.organization_id,
                        workspace_id=job.workspace_id,
                        finding_id=finding.id,
                        actor_id=job.requested_by,
                        action=action,
                        from_status=old_status if outcome == "reopened" else None,
                        to_status="reopened" if outcome == "reopened" else None,
                        changes={"scan_job_id": str(job.id), "occurrence_count": finding.occurrence_count},
                    ))
                    session.add(FindingOccurrence(
                        finding_id=finding.id,
                        job_id=job.id,
                        job_target_id=target.id,
                        raw_result_id=raw.id,
                        scanner_type=job.scanner_type,
                        severity=normalized.severity,
                        matched_location=normalized.matched_location,
                        evidence_summary=normalized.evidence_summary,
                        metadata_json=normalized.metadata,
                    ))
                    raw.processing_status = "processed"
                    raw.processed_at = now
                    session.add(AuditEvent(
                        organization_id=job.organization_id,
                        workspace_id=job.workspace_id,
                        actor_id=job.requested_by,
                        action=action,
                        target_type="finding",
                        target_id=finding.id,
                        after_summary={
                            "scanner_type": job.scanner_type,
                            "outcome": outcome,
                            "asset_id": str(target.asset_id),
                        },
                    ))

            async with session.begin():
                job = await repo.job_any(job_id, True)
                if job.status == "cancelled":
                    return
                transition_job(job, "failed" if had_failure else "completed")
                job.completed_at = datetime.now(UTC)
                await _audit(repo, job, "scan_job.failed" if had_failure else "scan_job.completed", {
                    "targets": job.target_count,
                    "raw_results": job.raw_result_count,
                    "findings_created": job.findings_created_count,
                    "findings_updated": job.findings_updated_count,
                    "findings_reopened": job.findings_reopened_count,
                })
    except Exception:
        logger.exception("Scan job orchestration failed", extra={"job_id": str(job_id)})
        async with factory() as session:
            repo = ScansRepository(session)
            async with session.begin():
                job = await repo.job_any(job_id, True)
                if job and job.status not in {"completed", "cancelled", "failed"}:
                    job.status = "failed"
                    job.failure_code = "processing_failed"
                    job.failure_message = safe_error("processing_failed")
                    job.completed_at = datetime.now(UTC)
                    job.version += 1
                    await _audit(repo, job, "scan_job.failed", {"failure_code": "processing_failed"})

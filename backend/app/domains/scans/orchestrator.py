import json
import logging
import random
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select

from app.database.models import AuditEvent, Finding, FindingActivity, FindingOccurrence, RawScanResult, ScanJobTarget
from app.database.repositories import ScansRepository
from app.database.session import get_session_factory
from app.domains.assets.metadata import redact_metadata
from app.domains.scans.adapters import scanner_registry
from app.domains.scans.adapters.base import ExecutionTarget, ScannerExecutionError, ScannerUnavailableError

logger = logging.getLogger("threatstream.scan-worker")
MAX_RAW_PAYLOAD = 128 * 1024
RETRYABLE_CODES = {"execution_timeout", "execution_failed", "processing_failed", "lease_expired"}
JOB_TRANSITIONS = {
    "queued": {"claimed", "cancelled"}, "claimed": {"running", "queued", "failed", "cancelled"},
    "running": {"processing", "queued", "failed", "cancelled"},
    "processing": {"completed", "queued", "failed", "cancelled"},
    "completed": set(), "failed": set(), "cancelled": set(),
}


class LeaseLostError(RuntimeError): pass


def transition_job(job, next_status):
    if next_status not in JOB_TRANSITIONS.get(job.status, set()): raise ValueError(f"Invalid scan job transition: {job.status} to {next_status}")
    job.status = next_status; job.version += 1


def safe_error(code):
    return {"scanner_unavailable": "Scanner is unavailable", "execution_timeout": "Scanner execution timed out", "output_limit": "Scanner output exceeded safety limits", "execution_failed": "Scanner execution failed", "processing_failed": "Scan processing failed", "lease_expired": "Worker lease expired"}.get(code, "Scan processing failed")


def retry_delay(attempt):
    base = (15, 60, 300)[min(max(attempt - 1, 0), 2)]
    return timedelta(seconds=min(300, base + random.randint(0, max(1, base // 10))))


async def _claimed(repo, job_id, worker_id, token, lock=True):
    job = await repo.claimed_job(job_id, worker_id, token, lock)
    if not job: raise LeaseLostError("Worker lease is no longer active")
    return job


async def _cancel(repo, job):
    job.status = "cancelled"; job.cancelled_at = datetime.now(UTC); job.version += 1
    await repo.release_claim(job); await repo.add_audit(job, job.requested_by, "scan_job.worker_cancelled", "scan_job", {"preserved_results": job.raw_result_count})


async def _fail_or_retry(factory, job_id, worker_id, token, code):
    async with factory() as session:
        repo = ScansRepository(session)
        async with session.begin():
            job = await repo.claimed_job(job_id, worker_id, token, True)
            if not job: return
            if job.cancellation_requested_at:
                await _cancel(repo, job); return
            job.last_failure_code = code; job.last_failure_summary = safe_error(code)
            if code in RETRYABLE_CODES and job.attempt_count < job.max_attempts:
                transition_job(job, "queued"); job.next_retry_at = datetime.now(UTC) + retry_delay(job.attempt_count); job.available_at = job.next_retry_at
                await repo.release_claim(job); await repo.add_audit(job, job.requested_by, "scan_job.retry_scheduled", "scan_job", {"failure_code": code, "attempt": job.attempt_count, "max_attempts": job.max_attempts})
            else:
                transition_job(job, "failed"); job.failure_code = code; job.failure_message = safe_error(code); job.completed_at = datetime.now(UTC)
                await repo.release_claim(job); await repo.add_audit(job, job.requested_by, "scan_job.attempts_exhausted" if code in RETRYABLE_CODES else "scan_job.failed", "scan_job", {"failure_code": code, "attempt": job.attempt_count})


async def execute_claimed_scan_job(job_id: UUID, worker_id: str, claim_token: str, session_factory=None) -> None:
    """Execute only under an active PostgreSQL lease; never claims work itself."""
    factory = session_factory or get_session_factory()
    adapter = None
    try:
        async with factory() as session:
            repo = ScansRepository(session)
            async with session.begin():
                job = await _claimed(repo, job_id, worker_id, claim_token)
                if job.cancellation_requested_at: await _cancel(repo, job); return
                transition_job(job, "running"); job.attempt_count += 1; job.started_at = job.started_at or datetime.now(UTC); job.next_retry_at = None
                profile = await repo.profile(job.workspace_id, job.profile_id); targets = await repo.job_targets(job.id)
                if not profile or not profile.is_enabled: raise ValueError("invalid_profile")
                configuration = dict(profile.configuration_json); target_ids = [target.id for target in targets]; adapter = scanner_registry.resolve(job.scanner_type)
                await repo.add_audit(job, job.requested_by, "scan_job.started", "scan_job", {"attempt": job.attempt_count, "target_count": job.target_count})

            had_failure = False; failure_code = None
            for target_id in target_ids:
                async with session.begin():
                    job = await _claimed(repo, job_id, worker_id, claim_token)
                    if job.cancellation_requested_at: await adapter.cancel(job.id); await _cancel(repo, job); return
                    target = await session.get(ScanJobTarget, target_id, with_for_update=True)
                    if target.execution_status == "completed": continue
                    target.execution_status = "running"; target.started_at = target.started_at or datetime.now(UTC)
                    execution = ExecutionTarget(job.id, target.id, target.asset_id, target.asset_type, target.normalized_target)
                try:
                    payloads = await adapter.execute_target(execution, configuration)
                except (ScannerUnavailableError, ScannerExecutionError) as exc:
                    had_failure = True
                    failure_code = "scanner_unavailable" if isinstance(exc, ScannerUnavailableError) else ("execution_timeout" if "timed out" in str(exc).lower() else "output_limit" if "limit" in str(exc).lower() else "execution_failed")
                    async with session.begin():
                        job = await _claimed(repo, job_id, worker_id, claim_token); target = await session.get(ScanJobTarget, target_id, with_for_update=True)
                        target.execution_status = "failed"; target.completed_at = datetime.now(UTC); target.error_summary = safe_error(failure_code)
                    break
                async with session.begin():
                    job = await _claimed(repo, job_id, worker_id, claim_token); target = await session.get(ScanJobTarget, target_id, with_for_update=True); persisted = 0
                    for payload in payloads:
                        safe = redact_metadata(payload); encoded = json.dumps(safe, separators=(",", ":"), ensure_ascii=False).encode()
                        if len(encoded) > MAX_RAW_PAYLOAD: had_failure = True; failure_code = "output_limit"; continue
                        _, created = await repo.add_raw(job, target, safe, adapter.definition.adapter_version, adapter.definition.parser_version); persisted += int(created)
                    target.execution_status = "completed"; target.completed_at = datetime.now(UTC); target.result_count = await session.scalar(select(func.count()).select_from(RawScanResult).where(RawScanResult.job_target_id == target.id))

            if had_failure:
                await _fail_or_retry(factory, job_id, worker_id, claim_token, failure_code or "execution_failed"); return

            async with session.begin():
                job = await _claimed(repo, job_id, worker_id, claim_token)
                if job.cancellation_requested_at: await _cancel(repo, job); return
                transition_job(job, "processing"); raw_ids = list(await session.scalars(select(RawScanResult.id).where(RawScanResult.job_id == job_id))); target_map = {target.id: target for target in await repo.job_targets(job_id)}

            for raw_id in raw_ids:
                async with session.begin():
                    job = await _claimed(repo, job_id, worker_id, claim_token); raw = await session.get(RawScanResult, raw_id, with_for_update=True)
                    if raw.processing_status == "processed" or await repo.occurrence_for_raw(raw.id): continue
                    target = target_map[raw.job_target_id]; normalized = adapter.normalize_result(job.workspace_id, ExecutionTarget(job.id, target.id, target.asset_id, target.asset_type, target.normalized_target), raw.payload_json)
                    finding = await repo.finding_by_fingerprint(job.workspace_id, normalized.fingerprint); now = datetime.now(UTC); old_status = None
                    if finding is None:
                        finding = Finding(organization_id=job.organization_id, workspace_id=job.workspace_id, title=normalized.title, description=normalized.description, severity=normalized.severity, status="open", source=job.scanner_type, external_id=normalized.template_id, remediation=normalized.remediation, asset_id=target.asset_id, scanner_fingerprint=normalized.fingerprint, scanner_type=job.scanner_type, first_detected_at=now, last_detected_at=now, occurrence_count=1, scanner_metadata=normalized.metadata, created_by=job.requested_by, updated_by=job.requested_by); session.add(finding); await session.flush(); outcome="created"; action="finding.created_from_scan"; job.findings_created_count += 1
                    else:
                        old_status=finding.status; changed=finding.severity != normalized.severity; finding.last_detected_at=now; finding.occurrence_count += 1; finding.scanner_metadata=normalized.metadata; finding.severity=normalized.severity; finding.updated_at=now; finding.updated_by=job.requested_by; finding.version += 1
                        if old_status in {"resolved","closed"}: finding.status="reopened"; finding.reopened_at=now; outcome="reopened"; action="finding.reopened_from_scan"; job.findings_reopened_count += 1
                        else: outcome="updated" if changed else "unchanged"; action="finding.updated_from_scan"; job.findings_updated_count += int(changed); job.findings_unchanged_count += int(not changed)
                    session.add(FindingActivity(organization_id=job.organization_id,workspace_id=job.workspace_id,finding_id=finding.id,actor_id=job.requested_by,action=action,from_status=old_status if outcome=="reopened" else None,to_status="reopened" if outcome=="reopened" else None,changes={"scan_job_id":str(job.id),"occurrence_count":finding.occurrence_count}))
                    session.add(FindingOccurrence(finding_id=finding.id,job_id=job.id,job_target_id=target.id,raw_result_id=raw.id,scanner_type=job.scanner_type,severity=normalized.severity,matched_location=normalized.matched_location,evidence_summary=normalized.evidence_summary,metadata_json=normalized.metadata)); raw.processing_status="processed"; raw.processed_at=now
                    session.add(AuditEvent(organization_id=job.organization_id,workspace_id=job.workspace_id,actor_id=job.requested_by,action=action,target_type="finding",target_id=finding.id,after_summary={"scanner_type":job.scanner_type,"outcome":outcome,"asset_id":str(target.asset_id)}))

            async with session.begin():
                job = await _claimed(repo, job_id, worker_id, claim_token); transition_job(job, "completed"); job.completed_at = datetime.now(UTC)
                job.processed_target_count = await session.scalar(select(func.count()).select_from(ScanJobTarget).where(ScanJobTarget.job_id == job.id, ScanJobTarget.execution_status == "completed")); job.raw_result_count = await session.scalar(select(func.count()).select_from(RawScanResult).where(RawScanResult.job_id == job.id))
                await repo.release_claim(job); await repo.add_audit(job, job.requested_by, "scan_job.completed", "scan_job", {"attempt":job.attempt_count,"targets":job.target_count,"raw_results":job.raw_result_count})
    except LeaseLostError:
        logger.warning("Scan execution stopped after lease loss", extra={"job_id": str(job_id)})
        if adapter: await adapter.cancel(job_id)
    except ValueError as exc:
        code = "invalid_profile" if str(exc) == "invalid_profile" else "invalid_configuration"; await _fail_or_retry(factory, job_id, worker_id, claim_token, code)
    except Exception:
        logger.exception("Sanitized scan execution failure", extra={"job_id": str(job_id)}); await _fail_or_retry(factory, job_id, worker_id, claim_token, "processing_failed")

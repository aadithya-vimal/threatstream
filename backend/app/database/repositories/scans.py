import hashlib
import json
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import (
    Asset, AuditEvent, Finding, FindingOccurrence, RawScanResult, ScanJob,
    ScanJobTarget, ScanProfile, ScanProfileTarget, ScanSchedule, User, Workspace,
)

ACTIVE_JOB_STATUSES = ("queued", "claimed", "running", "processing")
LEASED_STATUSES = ("claimed", "running", "processing")


class ScansRepository:
    def __init__(self, session: AsyncSession): self.session = session

    async def workspace_org(self, workspace_id):
        return await self.session.scalar(select(Workspace.organization_id).where(Workspace.id == workspace_id))

    async def profiles(self, workspace_id):
        count = select(func.count(ScanProfileTarget.asset_id)).where(ScanProfileTarget.profile_id == ScanProfile.id).correlate(ScanProfile).scalar_subquery()
        return list((await self.session.execute(select(ScanProfile, count.label("target_count")).where(ScanProfile.workspace_id == workspace_id).order_by(ScanProfile.name))).all())

    async def profile(self, workspace_id, profile_id, lock=False):
        query = select(ScanProfile).where(ScanProfile.workspace_id == workspace_id, ScanProfile.id == profile_id)
        return await self.session.scalar(query.with_for_update() if lock else query)

    async def create_profile(self, **values):
        row = ScanProfile(**values); self.session.add(row); await self.session.flush(); return row

    async def profile_targets(self, workspace_id, profile_id):
        return list((await self.session.execute(select(ScanProfileTarget, Asset).join(Asset, Asset.id == ScanProfileTarget.asset_id).where(ScanProfileTarget.workspace_id == workspace_id, ScanProfileTarget.profile_id == profile_id).order_by(Asset.name))).all())

    async def assets(self, workspace_id, ids):
        return list((await self.session.scalars(select(Asset).where(Asset.workspace_id == workspace_id, Asset.id.in_(ids), Asset.is_active == True))).all())

    async def add_target(self, profile_id, asset_id, workspace_id, actor_id):
        self.session.add(ScanProfileTarget(profile_id=profile_id, asset_id=asset_id, workspace_id=workspace_id, created_by=actor_id)); await self.session.flush()

    async def remove_target(self, profile_id, asset_id):
        row = await self.session.scalar(select(ScanProfileTarget).where(ScanProfileTarget.profile_id == profile_id, ScanProfileTarget.asset_id == asset_id))
        if row: await self.session.delete(row)
        return bool(row)

    async def active_job(self, workspace_id, profile_id):
        return await self.session.scalar(select(ScanJob.id).where(ScanJob.workspace_id == workspace_id, ScanJob.profile_id == profile_id, ScanJob.status.in_(ACTIVE_JOB_STATUSES)).limit(1))

    async def create_job(self, profile, user_id, targets, *, origin="manual", schedule_id=None, scheduled_for=None, max_attempts=3):
        job = ScanJob(workspace_id=profile.workspace_id, organization_id=profile.organization_id, profile_id=profile.id, scanner_type=profile.scanner_type, requested_by=user_id, target_count=len(targets), available_at=datetime.now(UTC), origin=origin, schedule_id=schedule_id, scheduled_for=scheduled_for, max_attempts=max_attempts)
        self.session.add(job); await self.session.flush()
        rows = []
        for _, asset in targets:
            row = ScanJobTarget(job_id=job.id, asset_id=asset.id, workspace_id=profile.workspace_id, normalized_target=asset.normalized_identifier, asset_type=asset.asset_type)
            self.session.add(row); rows.append(row)
        await self.session.flush(); return job, rows

    async def claim_next(self, worker_id: str, lease_seconds: int):
        now = datetime.now(UTC)
        query = select(ScanJob).where(
            ScanJob.status == "queued", ScanJob.available_at <= now,
            or_(ScanJob.next_retry_at.is_(None), ScanJob.next_retry_at <= now),
            ScanJob.cancellation_requested_at.is_(None),
            or_(ScanJob.lease_expires_at.is_(None), ScanJob.lease_expires_at <= now),
        ).order_by(ScanJob.available_at, ScanJob.created_at).with_for_update(skip_locked=True).limit(1)
        job = await self.session.scalar(query)
        if not job: return None
        job.status = "claimed"; job.claim_token = secrets.token_urlsafe(32); job.worker_id = worker_id
        job.claimed_by = "durable-worker"; job.claimed_at = now; job.heartbeat_at = now
        job.lease_expires_at = now + timedelta(seconds=lease_seconds); job.version += 1
        await self.session.flush(); return job

    async def claimed_job(self, job_id, worker_id, claim_token, lock=False):
        query = select(ScanJob).where(ScanJob.id == job_id, ScanJob.worker_id == worker_id, ScanJob.claim_token == claim_token, ScanJob.status.in_(LEASED_STATUSES), ScanJob.lease_expires_at > datetime.now(UTC))
        return await self.session.scalar(query.with_for_update() if lock else query)

    async def heartbeat(self, job_id, worker_id, claim_token, lease_seconds):
        job = await self.claimed_job(job_id, worker_id, claim_token, True)
        if not job or (job.lease_expires_at and job.lease_expires_at <= datetime.now(UTC)): return None
        now = datetime.now(UTC); job.heartbeat_at = now; job.lease_expires_at = now + timedelta(seconds=lease_seconds)
        return job

    async def release_claim(self, job):
        job.claim_token = None; job.worker_id = None; job.claimed_by = None; job.claimed_at = None; job.lease_expires_at = None

    async def expired_jobs(self, limit=100):
        now = datetime.now(UTC)
        return list((await self.session.scalars(select(ScanJob).where(ScanJob.status.in_(LEASED_STATUSES), ScanJob.lease_expires_at <= now).order_by(ScanJob.lease_expires_at).with_for_update(skip_locked=True).limit(limit))).all())

    async def job(self, workspace_id, job_id, lock=False):
        query = select(ScanJob).where(ScanJob.workspace_id == workspace_id, ScanJob.id == job_id)
        return await self.session.scalar(query.with_for_update() if lock else query)

    async def job_any(self, job_id, lock=False):
        query = select(ScanJob).where(ScanJob.id == job_id)
        return await self.session.scalar(query.with_for_update() if lock else query)

    async def job_targets(self, job_id):
        return list((await self.session.scalars(select(ScanJobTarget).where(ScanJobTarget.job_id == job_id).order_by(ScanJobTarget.id))).all())

    async def list_jobs(self, workspace_id, *, page, page_size, statuses, scanner_type, profile_id, asset_id, requested_by, date_from, date_to, search, sort, direction):
        conditions = [ScanJob.workspace_id == workspace_id]
        if statuses: conditions.append(ScanJob.status.in_(statuses))
        if scanner_type: conditions.append(ScanJob.scanner_type == scanner_type)
        if profile_id: conditions.append(ScanJob.profile_id == profile_id)
        if requested_by: conditions.append(ScanJob.requested_by == requested_by)
        if date_from: conditions.append(ScanJob.created_at >= date_from)
        if date_to: conditions.append(ScanJob.created_at <= date_to)
        if asset_id: conditions.append(ScanJob.id.in_(select(ScanJobTarget.job_id).where(ScanJobTarget.asset_id == asset_id)))
        if search: conditions.append(or_(ScanProfile.name.ilike(f"%{search.strip()}%"), ScanJob.failure_code.ilike(f"%{search.strip()}%")))
        total = int(await self.session.scalar(select(func.count()).select_from(ScanJob).join(ScanProfile, ScanProfile.id == ScanJob.profile_id).where(*conditions)) or 0)
        columns = {"created_at": ScanJob.created_at, "updated_at": ScanJob.updated_at, "status": ScanJob.status, "completed_at": ScanJob.completed_at}
        order = columns[sort]; order = order.asc() if direction == "asc" else order.desc()
        rows = await self.session.execute(select(ScanJob, ScanProfile.name, User.email).join(ScanProfile, ScanProfile.id == ScanJob.profile_id).outerjoin(User, User.id == ScanJob.requested_by).where(*conditions).order_by(order, ScanJob.id).offset((page - 1) * page_size).limit(page_size))
        return list(rows.all()), total

    async def raw_results(self, workspace_id, job_id, limit=10000):
        return list((await self.session.scalars(select(RawScanResult).join(ScanJob, ScanJob.id == RawScanResult.job_id).where(ScanJob.workspace_id == workspace_id, RawScanResult.job_id == job_id).order_by(RawScanResult.received_at).limit(limit))).all())

    async def safe_results(self, workspace_id, job_id, limit=100):
        return list((await self.session.execute(select(RawScanResult, FindingOccurrence.finding_id).join(ScanJob, ScanJob.id == RawScanResult.job_id).outerjoin(FindingOccurrence, FindingOccurrence.raw_result_id == RawScanResult.id).where(ScanJob.workspace_id == workspace_id, RawScanResult.job_id == job_id).order_by(RawScanResult.received_at).limit(limit))).all())

    async def add_raw(self, job, target, payload, adapter_version, parser_version):
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode(); digest = hashlib.sha256(encoded).hexdigest()
        existing = await self.session.scalar(select(RawScanResult).where(RawScanResult.job_target_id == target.id, RawScanResult.payload_hash == digest))
        if existing: return existing, False
        row = RawScanResult(job_id=job.id, job_target_id=target.id, scanner_type=job.scanner_type, adapter_version=adapter_version, parser_version=parser_version, payload_json=payload, payload_hash=digest)
        self.session.add(row); await self.session.flush(); return row, True

    async def finding_by_fingerprint(self, workspace_id, fingerprint):
        return await self.session.scalar(select(Finding).where(Finding.workspace_id == workspace_id, Finding.scanner_fingerprint == fingerprint).with_for_update())

    async def occurrence_for_raw(self, raw_id):
        return await self.session.scalar(select(FindingOccurrence).where(FindingOccurrence.raw_result_id == raw_id))

    async def schedules(self, workspace_id, *, page, page_size, profile_id=None, enabled=None, schedule_type=None, next_from=None, next_to=None, search=None, sort="next_run_at", direction="asc"):
        conditions = [ScanSchedule.workspace_id == workspace_id]
        if profile_id: conditions.append(ScanSchedule.profile_id == profile_id)
        if enabled is not None: conditions.append(ScanSchedule.is_enabled == enabled)
        if schedule_type: conditions.append(ScanSchedule.schedule_type == schedule_type)
        if next_from: conditions.append(ScanSchedule.next_run_at >= next_from)
        if next_to: conditions.append(ScanSchedule.next_run_at <= next_to)
        if search: conditions.append(ScanSchedule.name.ilike(f"%{search.strip()}%"))
        total = int(await self.session.scalar(select(func.count()).select_from(ScanSchedule).where(*conditions)) or 0)
        columns = {"next_run_at": ScanSchedule.next_run_at, "created_at": ScanSchedule.created_at, "name": ScanSchedule.name, "updated_at": ScanSchedule.updated_at}
        order = columns[sort]; order = order.asc() if direction == "asc" else order.desc()
        rows = await self.session.execute(select(ScanSchedule, ScanProfile.name, ScanProfile.scanner_type).join(ScanProfile, ScanProfile.id == ScanSchedule.profile_id).where(*conditions).order_by(order, ScanSchedule.id).offset((page - 1) * page_size).limit(page_size))
        return list(rows.all()), total

    async def schedule(self, workspace_id, schedule_id, lock=False):
        query = select(ScanSchedule).where(ScanSchedule.workspace_id == workspace_id, ScanSchedule.id == schedule_id)
        return await self.session.scalar(query.with_for_update() if lock else query)

    async def due_schedules(self, limit=50):
        return list((await self.session.scalars(select(ScanSchedule).where(ScanSchedule.is_enabled == True, ScanSchedule.next_run_at <= datetime.now(UTC)).order_by(ScanSchedule.next_run_at).with_for_update(skip_locked=True).limit(limit))).all())

    async def worker_status(self, workspace_id):
        now = datetime.now(UTC); recent = now - timedelta(seconds=180)
        queued = await self.session.scalar(select(func.count()).select_from(ScanJob).where(ScanJob.workspace_id == workspace_id, ScanJob.status == "queued"))
        active = await self.session.scalar(select(func.count()).select_from(ScanJob).where(ScanJob.workspace_id == workspace_id, ScanJob.status.in_(LEASED_STATUSES), ScanJob.lease_expires_at > now))
        expired = await self.session.scalar(select(func.count()).select_from(ScanJob).where(ScanJob.workspace_id == workspace_id, ScanJob.status.in_(LEASED_STATUSES), ScanJob.lease_expires_at <= now))
        heartbeat = await self.session.scalar(select(func.max(ScanJob.heartbeat_at)).where(ScanJob.workspace_id == workspace_id))
        state = "healthy" if heartbeat and heartbeat >= recent else ("degraded" if active or queued else "unavailable")
        return {"status": state, "last_observed_worker_heartbeat": heartbeat, "active_lease_count": int(active or 0), "queued_job_count": int(queued or 0), "expired_lease_count": int(expired or 0)}

    async def add_audit(self, row, actor, action, target_type, summary=None):
        self.session.add(AuditEvent(organization_id=row.organization_id, workspace_id=row.workspace_id, actor_id=actor, action=action, target_type=target_type, target_id=row.id, after_summary=summary or {}))

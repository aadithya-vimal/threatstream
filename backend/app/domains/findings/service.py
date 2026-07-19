from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthenticatedPrincipal
from app.database.repositories import FindingsRepository
from app.domains.findings.schemas import CommentCreate, EvidenceCreate, FindingCreate, FindingPage, FindingTransition, FindingUpdate


TRANSITIONS = {
    "open": {"acknowledged", "in_progress", "resolved", "closed"},
    "acknowledged": {"in_progress", "resolved", "closed"},
    "in_progress": {"resolved", "closed"},
    "resolved": {"closed", "reopened"},
    "closed": {"reopened"},
    "reopened": {"acknowledged", "in_progress", "resolved", "closed"},
}


def assignee_dict(user) -> dict | None:
    return {"id": user.id, "email": user.email, "display_name": user.display_name} if user else None


def asset_dict(asset) -> dict | None:
    return {"id": asset.id, "name": asset.name, "asset_type": asset.asset_type, "canonical_identifier": asset.canonical_identifier, "is_active": asset.is_active} if asset else None


def finding_dict(finding, assignee=None, asset=None) -> dict[str, Any]:
    return {
        "id": finding.id, "workspace_id": finding.workspace_id, "title": finding.title,
        "description": finding.description, "severity": finding.severity, "status": finding.status,
        "source": finding.source, "external_id": finding.external_id, "remediation": finding.remediation,
        "resolution_summary": finding.resolution_summary, "assignee": assignee_dict(assignee), "asset": asset_dict(asset),
        "version": finding.version, "created_at": finding.created_at, "updated_at": finding.updated_at,
        "acknowledged_at": finding.acknowledged_at, "started_at": finding.started_at,
        "resolved_at": finding.resolved_at, "closed_at": finding.closed_at, "reopened_at": finding.reopened_at,
        "scanner_type": getattr(finding, "scanner_type", None),
        "scanner_reference": finding.scanner_fingerprint[:12] if getattr(finding, "scanner_fingerprint", None) else None,
        "first_detected_at": getattr(finding, "first_detected_at", None),
        "last_detected_at": getattr(finding, "last_detected_at", None),
        "occurrence_count": getattr(finding, "occurrence_count", 0),
    }


class FindingsService:
    def __init__(self, session: AsyncSession, user: AuthenticatedPrincipal):
        self.session = session
        self.user = user
        self.repository = FindingsRepository(session)

    @staticmethod
    def _missing() -> HTTPException:
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    @staticmethod
    def _check_version(finding, version: int) -> None:
        if finding.version != version:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Finding changed since it was loaded. Refresh and retry.")

    async def _validate_assignee(self, workspace_id: UUID, user_id: UUID | None):
        if user_id is None:
            return None
        user = await self.repository.get_assignee(workspace_id, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Assignee must be an active workspace member")
        return user

    async def list(self, workspace_id: UUID, **filters) -> FindingPage:
        rows, total = await self.repository.list_findings(workspace_id, **filters)
        return FindingPage.create([finding_dict(finding, assignee, asset) for finding, assignee, asset in rows], filters["page"], filters["page_size"], total)

    async def assignees(self, workspace_id: UUID) -> list[dict]:
        return [assignee_dict(user) for user in await self.repository.list_assignees(workspace_id)]

    async def detail(self, workspace_id: UUID, finding_id: UUID) -> dict:
        finding = await self.repository.get_finding(workspace_id, finding_id)
        if finding is None: raise self._missing()
        assignee = await self.repository.get_assignee(workspace_id, finding.assignee_user_id) if finding.assignee_user_id else None
        asset_id = getattr(finding, "asset_id", None)
        asset = await self.repository.get_asset(workspace_id, asset_id) if asset_id else None
        result = finding_dict(finding, assignee, asset)
        result["evidence"] = [{"id": row.id, "kind": row.kind, "title": row.title, "content": row.content, "created_by": row.created_by, "created_at": row.created_at} for row in await self.repository.evidence(finding.id)]
        result["comments"] = [{"id": row.id, "body": row.body, "created_by": row.created_by, "author_email": author.email if author else None, "author_name": author.display_name if author else None, "created_at": row.created_at} for row, author in await self.repository.comments(finding.id)]
        result["activity"] = [{"id": row.id, "action": row.action, "from_status": row.from_status, "to_status": row.to_status, "changes": row.changes or {}, "actor_email": actor.email if actor else None, "actor_name": actor.display_name if actor else None, "created_at": row.created_at} for row, actor in await self.repository.activity(finding.id)]
        result["occurrences"] = [{"id": row.id, "job_id": row.job_id, "scanner_type": row.scanner_type, "detected_at": row.detected_at, "severity": row.severity, "matched_location": row.matched_location, "evidence_summary": row.evidence_summary or {}} for row in await self.repository.occurrences(finding.id)]
        return result

    async def create(self, workspace_id: UUID, payload: FindingCreate) -> dict:
        try:
            async with self.session.begin():
                organization_id = await self.repository.workspace_organization_id(workspace_id)
                if organization_id is None: raise HTTPException(status_code=404, detail="Workspace not found")
                assignee = await self._validate_assignee(workspace_id, payload.assignee_user_id)
                asset = await self.repository.get_asset(workspace_id, payload.asset_id) if payload.asset_id else None
                if payload.asset_id and asset is None: raise HTTPException(status_code=422, detail="Asset must belong to the finding workspace")
                finding = await self.repository.create_finding(
                    organization_id=organization_id, workspace_id=workspace_id, title=payload.title,
                    description=payload.description, severity=payload.severity.value, source=payload.source,
                    external_id=payload.external_id or None, remediation=payload.remediation or None,
                    assignee_user_id=payload.assignee_user_id, asset_id=payload.asset_id, created_by=self.user.user_id, updated_by=self.user.user_id,
                )
                summary = {"severity": finding.severity, "status": finding.status, "source": finding.source}
                await self.repository.add_activity(finding, self.user.user_id, "finding.created", changes=summary)
                await self.repository.add_audit(finding, self.user.user_id, "finding.created", after_summary=summary)
                if asset: await self.repository.add_audit(finding, self.user.user_id, "finding.asset_assigned", after_summary={"asset_id": str(asset.id), "asset_type": asset.asset_type})
        except IntegrityError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A finding with this source and external ID already exists in the workspace") from exc
        return finding_dict(finding, assignee, asset)

    async def update(self, workspace_id: UUID, finding_id: UUID, payload: FindingUpdate) -> dict:
        async with self.session.begin():
            finding = await self.repository.get_finding(workspace_id, finding_id, for_update=True)
            if finding is None: raise self._missing()
            self._check_version(finding, payload.version)
            fields = payload.model_fields_set - {"version"}
            assignee = None
            if "assignee_user_id" in fields:
                assignee = await self._validate_assignee(workspace_id, payload.assignee_user_id)
            elif finding.assignee_user_id:
                assignee = await self.repository.get_assignee(workspace_id, finding.assignee_user_id)
            asset = None
            if "asset_id" in fields:
                asset = await self.repository.get_asset(workspace_id, payload.asset_id) if payload.asset_id else None
                if payload.asset_id and asset is None: raise HTTPException(status_code=422, detail="Asset must belong to the finding workspace")
            elif getattr(finding, "asset_id", None):
                asset = await self.repository.get_asset(workspace_id, finding.asset_id)
            before, changes = {}, {}
            for field in fields:
                value = getattr(payload, field)
                if hasattr(value, "value"): value = value.value
                old = getattr(finding, field)
                if old != value:
                    before[field] = str(old) if isinstance(old, UUID) else old
                    changes[field] = str(value) if isinstance(value, UUID) else value
                    setattr(finding, field, value or None if field in {"remediation", "resolution_summary"} else value)
            if not changes:
                return finding_dict(finding, assignee, asset)
            safe_fields = {"severity", "assignee_user_id", "asset_id"}
            safe_before = {field: value if field in safe_fields else {"changed": True} for field, value in before.items()}
            safe_changes = {field: value if field in safe_fields else {"changed": True} for field, value in changes.items()}
            self.repository.touch(finding, self.user.user_id)
            await self.repository.add_activity(finding, self.user.user_id, "finding.updated", changes=safe_changes)
            await self.repository.add_audit(finding, self.user.user_id, "finding.updated", before_summary=safe_before, after_summary=safe_changes, metadata={"changed_fields": sorted(changes)})
            if "asset_id" in changes:
                action="finding.asset_assigned" if payload.asset_id else "finding.asset_removed"
                await self.repository.add_audit(finding,self.user.user_id,action,before_summary={"asset_id":before.get("asset_id")},after_summary={"asset_id":changes.get("asset_id")})
                await self.repository.add_activity(finding,self.user.user_id,action,changes={"asset_id":changes.get("asset_id")})
        return finding_dict(finding, assignee, asset)

    async def transition(self, workspace_id: UUID, finding_id: UUID, payload: FindingTransition) -> dict:
        async with self.session.begin():
            finding = await self.repository.get_finding(workspace_id, finding_id, for_update=True)
            if finding is None: raise self._missing()
            self._check_version(finding, payload.version)
            next_status = payload.status.value
            if next_status not in TRANSITIONS[finding.status]:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Cannot transition from {finding.status} to {next_status}")
            if next_status in {"resolved", "closed"} and not (payload.note or finding.resolution_summary):
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="A resolution summary is required")
            if next_status == "reopened" and not payload.note:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="A reopen note is required")
            previous = finding.status
            finding.status = next_status
            now = datetime.now(UTC)
            timestamp_field = {"acknowledged": "acknowledged_at", "in_progress": "started_at", "resolved": "resolved_at", "closed": "closed_at", "reopened": "reopened_at"}.get(next_status)
            if timestamp_field: setattr(finding, timestamp_field, now)
            if next_status in {"resolved", "closed"} and payload.note: finding.resolution_summary = payload.note
            self.repository.touch(finding, self.user.user_id)
            changes = {"status": next_status, **({"note": payload.note} if payload.note else {})}
            await self.repository.add_activity(finding, self.user.user_id, "finding.status_changed", from_status=previous, to_status=next_status, changes=changes)
            await self.repository.add_audit(finding, self.user.user_id, "finding.status_changed", before_summary={"status": previous}, after_summary={"status": next_status}, metadata={"has_note": bool(payload.note)})
            assignee = await self.repository.get_assignee(workspace_id, finding.assignee_user_id) if finding.assignee_user_id else None
            asset_id = getattr(finding, "asset_id", None)
            asset = await self.repository.get_asset(workspace_id, asset_id) if asset_id else None
        return finding_dict(finding, assignee, asset)

    async def add_comment(self, workspace_id: UUID, finding_id: UUID, payload: CommentCreate) -> dict:
        async with self.session.begin():
            finding = await self.repository.get_finding(workspace_id, finding_id, for_update=True)
            if finding is None: raise self._missing()
            self._check_version(finding, payload.version)
            comment = await self.repository.add_comment(finding, self.user.user_id, payload.body)
            self.repository.touch(finding, self.user.user_id)
            await self.repository.add_activity(finding, self.user.user_id, "finding.comment_added", changes={"comment_id": str(comment.id)})
            await self.repository.add_audit(finding, self.user.user_id, "finding.comment_added", metadata={"comment_id": str(comment.id)})
        return {"id": comment.id, "body": comment.body, "created_by": comment.created_by, "author_email": self.user.email, "author_name": self.user.display_name, "created_at": comment.created_at}

    async def add_evidence(self, workspace_id: UUID, finding_id: UUID, payload: EvidenceCreate) -> dict:
        async with self.session.begin():
            finding = await self.repository.get_finding(workspace_id, finding_id, for_update=True)
            if finding is None: raise self._missing()
            self._check_version(finding, payload.version)
            evidence = await self.repository.add_evidence(finding, self.user.user_id, kind=payload.kind.value, title=payload.title, content=payload.content)
            self.repository.touch(finding, self.user.user_id)
            await self.repository.add_activity(finding, self.user.user_id, "finding.evidence_added", changes={"evidence_id": str(evidence.id), "kind": evidence.kind, "title": evidence.title})
            await self.repository.add_audit(finding, self.user.user_id, "finding.evidence_added", metadata={"evidence_id": str(evidence.id), "kind": evidence.kind})
        return {"id": evidence.id, "kind": evidence.kind, "title": evidence.title, "content": evidence.content, "created_by": evidence.created_by, "created_at": evidence.created_at}

    async def delete_evidence(self, workspace_id: UUID, finding_id: UUID, evidence_id: UUID, version: int) -> None:
        async with self.session.begin():
            finding = await self.repository.get_finding(workspace_id, finding_id, for_update=True)
            if finding is None: raise self._missing()
            self._check_version(finding, version)
            evidence = await self.repository.get_evidence(workspace_id, finding_id, evidence_id)
            if evidence is None: raise HTTPException(status_code=404, detail="Evidence not found")
            title, kind = evidence.title, evidence.kind
            await self.session.delete(evidence)
            self.repository.touch(finding, self.user.user_id)
            await self.repository.add_activity(finding, self.user.user_id, "finding.evidence_deleted", changes={"evidence_id": str(evidence_id), "kind": kind, "title": title})
            await self.repository.add_audit(finding, self.user.user_id, "finding.evidence_deleted", metadata={"evidence_id": str(evidence_id), "kind": kind})

    async def delete(self, workspace_id: UUID, finding_id: UUID, version: int) -> None:
        async with self.session.begin():
            finding = await self.repository.get_finding(workspace_id, finding_id, for_update=True)
            if finding is None: raise self._missing()
            self._check_version(finding, version)
            await self.repository.add_audit(finding, self.user.user_id, "finding.deleted", before_summary={"status": finding.status, "severity": finding.severity, "source": finding.source})
            await self.session.delete(finding)

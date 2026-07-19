from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Asset, AuditEvent, Finding, FindingActivity, FindingComment, FindingEvidence, FindingOccurrence, User, Workspace, WorkspaceMember


class FindingsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def workspace_organization_id(self, workspace_id: UUID) -> UUID | None:
        return await self.session.scalar(select(Workspace.organization_id).where(Workspace.id == workspace_id))

    async def list_findings(self, workspace_id: UUID, *, page: int, page_size: int, statuses: list[str], severities: list[str], assignee_user_id: UUID | None, asset_id: UUID | None, search: str | None, sort: str, direction: str) -> tuple[list[tuple[Finding, User | None, Asset | None]], int]:
        conditions = [Finding.workspace_id == workspace_id]
        if statuses: conditions.append(Finding.status.in_(statuses))
        if severities: conditions.append(Finding.severity.in_(severities))
        if assignee_user_id: conditions.append(Finding.assignee_user_id == assignee_user_id)
        if asset_id: conditions.append(Finding.asset_id == asset_id)
        if search:
            pattern = f"%{search.strip()}%"
            conditions.append(or_(Finding.title.ilike(pattern), Finding.description.ilike(pattern), Finding.source.ilike(pattern), Finding.external_id.ilike(pattern)))
        severity_order = case((Finding.severity == "critical", 5), (Finding.severity == "high", 4), (Finding.severity == "medium", 3), (Finding.severity == "low", 2), else_=1)
        sort_columns = {"created_at": Finding.created_at, "updated_at": Finding.updated_at, "title": Finding.title, "status": Finding.status, "severity": severity_order}
        order = sort_columns[sort]
        order = order.asc() if direction == "asc" else order.desc()
        total = int(await self.session.scalar(select(func.count()).select_from(Finding).where(*conditions)) or 0)
        rows = await self.session.execute(select(Finding, User, Asset).outerjoin(User, User.id == Finding.assignee_user_id).outerjoin(Asset, Asset.id == Finding.asset_id).where(*conditions).order_by(order, Finding.id.asc()).offset((page - 1) * page_size).limit(page_size))
        return list(rows.all()), total

    async def get_finding(self, workspace_id: UUID, finding_id: UUID, *, for_update: bool = False) -> Finding | None:
        query = select(Finding).where(Finding.workspace_id == workspace_id, Finding.id == finding_id)
        return await self.session.scalar(query.with_for_update() if for_update else query)

    async def occurrences(self, finding_id: UUID, limit: int = 100) -> list[FindingOccurrence]:
        return list((await self.session.scalars(
            select(FindingOccurrence).where(FindingOccurrence.finding_id == finding_id)
            .order_by(FindingOccurrence.detected_at.desc()).limit(limit)
        )).all())

    async def get_assignee(self, workspace_id: UUID, user_id: UUID) -> User | None:
        return await self.session.scalar(select(User).join(WorkspaceMember, WorkspaceMember.user_id == User.id).where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id, WorkspaceMember.status == "active", User.status == "active"))

    async def get_asset(self, workspace_id: UUID, asset_id: UUID) -> Asset | None:
        return await self.session.scalar(select(Asset).where(Asset.workspace_id == workspace_id, Asset.id == asset_id))

    async def list_assignees(self, workspace_id: UUID) -> list[User]:
        return list((await self.session.scalars(select(User).join(WorkspaceMember, WorkspaceMember.user_id == User.id).where(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.status == "active", User.status == "active").order_by(User.display_name, User.email, User.id))).all())

    async def create_finding(self, **values) -> Finding:
        finding = Finding(**values)
        self.session.add(finding)
        await self.session.flush()
        return finding

    async def comments(self, finding_id: UUID) -> list[tuple[FindingComment, User | None]]:
        rows = await self.session.execute(select(FindingComment, User).outerjoin(User, User.id == FindingComment.created_by).where(FindingComment.finding_id == finding_id).order_by(FindingComment.created_at.asc(), FindingComment.id.asc()))
        return list(rows.all())

    async def evidence(self, finding_id: UUID) -> list[FindingEvidence]:
        return list((await self.session.scalars(select(FindingEvidence).where(FindingEvidence.finding_id == finding_id).order_by(FindingEvidence.created_at.asc(), FindingEvidence.id.asc()))).all())

    async def activity(self, finding_id: UUID) -> list[tuple[FindingActivity, User | None]]:
        rows = await self.session.execute(select(FindingActivity, User).outerjoin(User, User.id == FindingActivity.actor_id).where(FindingActivity.finding_id == finding_id).order_by(FindingActivity.created_at.desc(), FindingActivity.id.desc()).limit(500))
        return list(rows.all())

    async def add_comment(self, finding: Finding, actor_id: UUID, body: str) -> FindingComment:
        comment = FindingComment(organization_id=finding.organization_id, workspace_id=finding.workspace_id, finding_id=finding.id, body=body, created_by=actor_id)
        self.session.add(comment); await self.session.flush(); return comment

    async def add_evidence(self, finding: Finding, actor_id: UUID, *, kind: str, title: str, content: str) -> FindingEvidence:
        evidence = FindingEvidence(organization_id=finding.organization_id, workspace_id=finding.workspace_id, finding_id=finding.id, kind=kind, title=title, content=content, created_by=actor_id)
        self.session.add(evidence); await self.session.flush(); return evidence

    async def get_evidence(self, workspace_id: UUID, finding_id: UUID, evidence_id: UUID) -> FindingEvidence | None:
        return await self.session.scalar(select(FindingEvidence).where(FindingEvidence.workspace_id == workspace_id, FindingEvidence.finding_id == finding_id, FindingEvidence.id == evidence_id))

    async def add_activity(self, finding: Finding, actor_id: UUID, action: str, *, from_status: str | None = None, to_status: str | None = None, changes: dict | None = None) -> FindingActivity:
        activity = FindingActivity(organization_id=finding.organization_id, workspace_id=finding.workspace_id, finding_id=finding.id, actor_id=actor_id, action=action, from_status=from_status, to_status=to_status, changes=changes or {})
        self.session.add(activity); await self.session.flush(); return activity

    async def add_audit(self, finding: Finding, actor_id: UUID, action: str, *, before_summary: dict | None = None, after_summary: dict | None = None, metadata: dict | None = None) -> None:
        self.session.add(AuditEvent(organization_id=finding.organization_id, workspace_id=finding.workspace_id, actor_id=actor_id, action=action, target_type="finding", target_id=finding.id, before_summary=before_summary, after_summary=after_summary, event_metadata=metadata or {}))

    @staticmethod
    def touch(finding: Finding, actor_id: UUID) -> None:
        finding.updated_by = actor_id
        finding.updated_at = datetime.now(UTC)
        finding.version += 1

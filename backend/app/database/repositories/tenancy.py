from uuid import UUID

from sqlalchemy import and_, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import (
    AuditEvent, Organization, OrganizationMember, Team, TeamMember,
    User, Workspace, WorkspaceMember, WorkspaceRolePermission,
)


class TenancyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def context(self, user_id: UUID) -> tuple[list[Organization], list[tuple[Workspace, str]]]:
        organization_ids = select(OrganizationMember.organization_id).where(
            OrganizationMember.user_id == user_id, OrganizationMember.status == "active"
        )
        organizations = list((await self.session.scalars(select(Organization).where(Organization.id.in_(organization_ids)).order_by(Organization.name))).all())
        admin_orgs = select(OrganizationMember.organization_id).where(
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
            OrganizationMember.role_key == "organization_administrator",
        )
        rows = (await self.session.execute(
            select(Workspace, WorkspaceMember.role_key)
            .outerjoin(WorkspaceMember, and_(WorkspaceMember.workspace_id == Workspace.id, WorkspaceMember.user_id == user_id, WorkspaceMember.status == "active"))
            .where(or_(WorkspaceMember.user_id == user_id, Workspace.organization_id.in_(admin_orgs)))
            .order_by(Workspace.name)
        )).all()
        return organizations, [(workspace, role or "organization_administrator") for workspace, role in rows]

    async def is_organization_administrator(self, organization_id: UUID, user_id: UUID) -> bool:
        return bool(await self.session.scalar(select(exists().where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
            OrganizationMember.role_key == "organization_administrator",
        ))))

    async def has_workspace_permission(self, workspace_id: UUID, user_id: UUID, permission: str) -> bool:
        organization_admin = exists().where(
            Workspace.id == workspace_id,
            OrganizationMember.organization_id == Workspace.organization_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
            OrganizationMember.role_key == "organization_administrator",
        )
        role_grant = exists().where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.status == "active",
            WorkspaceRolePermission.role_key == WorkspaceMember.role_key,
            WorkspaceRolePermission.permission_key == permission,
        )
        return bool(await self.session.scalar(select(or_(organization_admin, role_grant))))

    async def workspace_organization_id(self, workspace_id: UUID) -> UUID | None:
        return await self.session.scalar(select(Workspace.organization_id).where(Workspace.id == workspace_id))

    async def add_audit(self, *, organization_id: UUID, actor_id: UUID, action: str, target_type: str, target_id: UUID | None, workspace_id: UUID | None = None, after_summary: dict | None = None) -> None:
        self.session.add(AuditEvent(organization_id=organization_id, workspace_id=workspace_id, actor_id=actor_id, action=action, target_type=target_type, target_id=target_id, after_summary=after_summary))

    async def create_organization(self, user_id: UUID, name: str, slug: str, workspace_name: str, workspace_slug: str) -> tuple[Organization, Workspace]:
        organization = Organization(name=name.strip(), slug=slug.lower(), created_by=user_id)
        self.session.add(organization)
        await self.session.flush()
        self.session.add(OrganizationMember(organization_id=organization.id, user_id=user_id, role_key="organization_administrator"))
        workspace = Workspace(organization_id=organization.id, name=workspace_name.strip(), slug=workspace_slug.lower(), created_by=user_id)
        self.session.add(workspace)
        await self.session.flush()
        self.session.add(WorkspaceMember(workspace_id=workspace.id, user_id=user_id, role_key="workspace_administrator"))
        await self.add_audit(organization_id=organization.id, workspace_id=workspace.id, actor_id=user_id, action="organization.created", target_type="organization", target_id=organization.id, after_summary={"organization_name": organization.name, "workspace_name": workspace.name})
        return organization, workspace

    async def create_workspace(self, organization_id: UUID, user_id: UUID, name: str, slug: str, description: str | None) -> Workspace:
        workspace = Workspace(organization_id=organization_id, name=name.strip(), slug=slug.lower(), description=description, created_by=user_id)
        self.session.add(workspace)
        await self.session.flush()
        self.session.add(WorkspaceMember(workspace_id=workspace.id, user_id=user_id, role_key="workspace_administrator"))
        await self.add_audit(organization_id=organization_id, workspace_id=workspace.id, actor_id=user_id, action="workspace.created", target_type="workspace", target_id=workspace.id, after_summary={"name": workspace.name, "slug": workspace.slug})
        return workspace

    async def list_teams(self, workspace_id: UUID) -> list[Team]:
        return list((await self.session.scalars(select(Team).where(Team.workspace_id == workspace_id).order_by(Team.name).limit(200))).all())

    async def list_audit_events(self, workspace_id: UUID, limit: int = 100) -> list[tuple[AuditEvent, str | None]]:
        rows = await self.session.execute(
            select(AuditEvent, User.email)
            .outerjoin(User, User.id == AuditEvent.actor_id)
            .where(AuditEvent.workspace_id == workspace_id)
            .order_by(AuditEvent.created_at.desc())
            .limit(limit)
        )
        return list(rows.all())

    async def create_team(self, workspace_id: UUID, organization_id: UUID, user_id: UUID, name: str, slug: str, description: str | None) -> Team:
        team = Team(organization_id=organization_id, workspace_id=workspace_id, name=name.strip(), slug=slug.lower(), description=description, created_by=user_id)
        self.session.add(team)
        await self.session.flush()
        self.session.add(TeamMember(team_id=team.id, user_id=user_id, role_key="lead"))
        await self.add_audit(organization_id=organization_id, workspace_id=workspace_id, actor_id=user_id, action="team.created", target_type="team", target_id=team.id, after_summary={"name": team.name, "slug": team.slug})
        return team

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Asset, AssetTag, AssetTagLink, AuditEvent, Finding, User, Workspace, WorkspaceMember


class AssetsRepository:
    def __init__(self, session: AsyncSession): self.session = session

    async def workspace_organization_id(self, workspace_id: UUID):
        return await self.session.scalar(select(Workspace.organization_id).where(Workspace.id == workspace_id))

    async def list_assets(self, workspace_id: UUID, *, page: int, page_size: int, asset_types: list[str], criticalities: list[str], environments: list[str], active: bool | None, owner_user_id: UUID | None, source: str | None, tags: list[str], search: str | None, sort: str, direction: str):
        conditions = [Asset.workspace_id == workspace_id]
        if asset_types: conditions.append(Asset.asset_type.in_(asset_types))
        if criticalities: conditions.append(Asset.criticality.in_(criticalities))
        if environments: conditions.append(Asset.environment.in_(environments))
        if active is not None: conditions.append(Asset.is_active == active)
        if owner_user_id: conditions.append(Asset.owner_user_id == owner_user_id)
        if source: conditions.append(Asset.source == source.strip())
        if search:
            pattern=f"%{search.strip()}%"
            conditions.append(or_(Asset.name.ilike(pattern), Asset.canonical_identifier.ilike(pattern), Asset.normalized_identifier.ilike(pattern), Asset.description.ilike(pattern), Asset.external_id.ilike(pattern)))
        for tag in tags:
            conditions.append(Asset.id.in_(select(AssetTagLink.asset_id).join(AssetTag, AssetTag.id == AssetTagLink.tag_id).where(AssetTag.workspace_id == workspace_id, AssetTag.normalized_name == tag)))
        related_count = select(func.count(Finding.id)).where(Finding.asset_id == Asset.id).correlate(Asset).scalar_subquery()
        criticality_order = case((Asset.criticality=="critical",5),(Asset.criticality=="high",4),(Asset.criticality=="medium",3),(Asset.criticality=="low",2),else_=1)
        sort_columns={"name":Asset.name,"asset_type":Asset.asset_type,"criticality":criticality_order,"environment":Asset.environment,"first_seen_at":Asset.first_seen_at,"last_seen_at":Asset.last_seen_at,"created_at":Asset.created_at,"updated_at":Asset.updated_at,"related_findings_count":related_count}
        order=sort_columns[sort]; order=order.asc() if direction=="asc" else order.desc()
        total=int(await self.session.scalar(select(func.count()).select_from(Asset).where(*conditions)) or 0)
        rows=await self.session.execute(select(Asset,User,related_count.label("related_count")).outerjoin(User,User.id==Asset.owner_user_id).where(*conditions).order_by(order,Asset.id.asc()).offset((page-1)*page_size).limit(page_size))
        return list(rows.all()),total

    async def get_asset(self, workspace_id: UUID, asset_id: UUID, *, for_update=False):
        query=select(Asset).where(Asset.workspace_id==workspace_id,Asset.id==asset_id)
        return await self.session.scalar(query.with_for_update() if for_update else query)

    async def duplicate(self, workspace_id: UUID, asset_type: str, normalized_identifier: str, exclude_id: UUID | None=None):
        query=select(Asset.id).where(Asset.workspace_id==workspace_id,Asset.asset_type==asset_type,Asset.normalized_identifier==normalized_identifier)
        if exclude_id: query=query.where(Asset.id!=exclude_id)
        return await self.session.scalar(query)

    async def owner(self, workspace_id: UUID, user_id: UUID):
        return await self.session.scalar(select(User).join(WorkspaceMember,WorkspaceMember.user_id==User.id).where(WorkspaceMember.workspace_id==workspace_id,WorkspaceMember.user_id==user_id,WorkspaceMember.status=="active",User.status=="active"))

    async def owners(self, workspace_id: UUID):
        return list((await self.session.scalars(select(User).join(WorkspaceMember,WorkspaceMember.user_id==User.id).where(WorkspaceMember.workspace_id==workspace_id,WorkspaceMember.status=="active",User.status=="active").order_by(User.display_name,User.email,User.id))).all())

    async def create(self, **values):
        row=Asset(**values); self.session.add(row); await self.session.flush(); return row

    async def tags(self, asset_id: UUID):
        return list((await self.session.scalars(select(AssetTag).join(AssetTagLink,AssetTagLink.tag_id==AssetTag.id).where(AssetTagLink.asset_id==asset_id).order_by(AssetTag.normalized_name))).all())

    async def set_tags(self, asset: Asset, actor_id: UUID, tags: list[tuple[str,str]]):
        current=await self.tags(asset.id); current_by_name={tag.normalized_name:tag for tag in current}; desired={normalized:display for display,normalized in tags}
        remove_ids=[tag.id for name,tag in current_by_name.items() if name not in desired]
        if remove_ids:
            links=list((await self.session.scalars(select(AssetTagLink).where(AssetTagLink.asset_id==asset.id,AssetTagLink.tag_id.in_(remove_ids)))).all())
            for link in links: await self.session.delete(link)
        for normalized,display in desired.items():
            if normalized in current_by_name: continue
            tag=await self.session.scalar(select(AssetTag).where(AssetTag.workspace_id==asset.workspace_id,AssetTag.normalized_name==normalized))
            if tag is None:
                tag=AssetTag(organization_id=asset.organization_id,workspace_id=asset.workspace_id,display_name=display,normalized_name=normalized,created_by=actor_id); self.session.add(tag); await self.session.flush()
            self.session.add(AssetTagLink(asset_id=asset.id,tag_id=tag.id,created_by=actor_id))
        await self.session.flush()
        return await self.tags(asset.id)

    async def related_findings(self, workspace_id: UUID, asset_id: UUID):
        return list((await self.session.scalars(select(Finding).where(Finding.workspace_id==workspace_id,Finding.asset_id==asset_id).order_by(Finding.updated_at.desc()).limit(200))).all())

    async def activity(self, workspace_id: UUID, asset_id: UUID):
        rows=await self.session.execute(select(AuditEvent,User.email).outerjoin(User,User.id==AuditEvent.actor_id).where(AuditEvent.workspace_id==workspace_id,AuditEvent.target_type=="asset",AuditEvent.target_id==asset_id).order_by(AuditEvent.created_at.desc()).limit(100))
        return list(rows.all())

    async def add_audit(self, asset: Asset, actor_id: UUID, action: str, *, before=None, after=None, metadata=None):
        self.session.add(AuditEvent(organization_id=asset.organization_id,workspace_id=asset.workspace_id,actor_id=actor_id,action=action,target_type="asset",target_id=asset.id,before_summary=before,after_summary=after,event_metadata=metadata or {}))

    @staticmethod
    def touch(asset: Asset, actor_id: UUID):
        asset.updated_by=actor_id; asset.updated_at=datetime.now(UTC); asset.version+=1

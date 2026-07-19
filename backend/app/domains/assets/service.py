from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthenticatedPrincipal
from app.database.repositories import AssetsRepository, TenancyRepository
from app.domains.assets.identifiers import normalize_identifier, normalize_tag
from app.domains.assets.metadata import redact_metadata
from app.domains.assets.schemas import AssetCreate, AssetPage, AssetUpdate


def owner_dict(user): return {"id":user.id,"email":user.email,"display_name":user.display_name} if user else None


class AssetsService:
    def __init__(self, session: AsyncSession, user: AuthenticatedPrincipal):
        self.session=session; self.user=user; self.repository=AssetsRepository(session)

    @staticmethod
    def missing(): return HTTPException(status_code=404,detail="Asset not found")

    @staticmethod
    def check_version(row,version):
        if row.version!=version: raise HTTPException(status_code=409,detail="Asset changed since it was loaded. Refresh and retry.")

    async def _owner(self,workspace_id,user_id):
        if user_id is None:return None
        user=await self.repository.owner(workspace_id,user_id)
        if user is None:raise HTTPException(status_code=422,detail="Owner must be an active workspace member")
        return user

    async def _can_manage(self,workspace_id):
        return await TenancyRepository(self.session).has_workspace_permission(workspace_id,self.user.user_id,"asset:manage")

    async def _dict(self,row,owner=None,count=0):
        tags=[tag.display_name for tag in await self.repository.tags(row.id)]
        return {"id":row.id,"workspace_id":row.workspace_id,"organization_id":row.organization_id,"name":row.name,"asset_type":row.asset_type,"canonical_identifier":row.canonical_identifier,"normalized_identifier":row.normalized_identifier,"environment":row.environment,"criticality":row.criticality,"owner":owner_dict(owner),"description":row.description,"source":row.source,"external_id":row.external_id,"is_active":row.is_active,"first_seen_at":row.first_seen_at,"last_seen_at":row.last_seen_at,"metadata_json":redact_metadata(row.metadata_json or {}),"tags":tags,"related_findings_count":count,"version":row.version,"created_at":row.created_at,"updated_at":row.updated_at}

    async def list(self,workspace_id,**filters):
        filters["tags"]=[normalize_tag(tag)[1] for tag in filters["tags"]]
        rows,total=await self.repository.list_assets(workspace_id,**filters)
        return AssetPage.create([await self._dict(row,owner,count) for row,owner,count in rows],filters["page"],filters["page_size"],total)

    async def owners(self,workspace_id): return [owner_dict(user) for user in await self.repository.owners(workspace_id)]

    async def detail(self,workspace_id,asset_id):
        row=await self.repository.get_asset(workspace_id,asset_id)
        if row is None:raise self.missing()
        owner=await self.repository.owner(workspace_id,row.owner_user_id) if row.owner_user_id else None
        findings=await self.repository.related_findings(workspace_id,asset_id)
        activity=await self.repository.activity(workspace_id,asset_id)
        result=await self._dict(row,owner,len(findings)); result["related_findings"]=[{"id":f.id,"title":f.title,"severity":f.severity,"status":f.status,"updated_at":f.updated_at} for f in findings];result["activity"]=[{"id":event.id,"action":event.action,"actor_email":actor_email,"created_at":event.created_at} for event,actor_email in activity]
        return result

    async def create(self,workspace_id:UUID,payload:AssetCreate):
        canonical,normalized=normalize_identifier(payload.asset_type.value,payload.canonical_identifier)
        tags=list(dict.fromkeys(normalize_tag(tag)[1] for tag in payload.tags))
        tag_pairs=[normalize_tag(next(value for value in payload.tags if normalize_tag(value)[1]==name)) for name in tags]
        try:
            async with self.session.begin():
                organization_id=await self.repository.workspace_organization_id(workspace_id)
                if organization_id is None:raise HTTPException(status_code=404,detail="Workspace not found")
                if payload.owner_user_id and not await self._can_manage(workspace_id):raise HTTPException(status_code=403,detail="asset:manage permission required to assign ownership")
                if await self.repository.duplicate(workspace_id,payload.asset_type.value,normalized):raise HTTPException(status_code=409,detail="An asset with this type and identifier already exists in the workspace")
                owner=await self._owner(workspace_id,payload.owner_user_id)
                now=datetime.now(UTC)
                row=await self.repository.create(organization_id=organization_id,workspace_id=workspace_id,name=payload.name,asset_type=payload.asset_type.value,canonical_identifier=canonical,normalized_identifier=normalized,environment=payload.environment.value,criticality=payload.criticality.value,owner_user_id=payload.owner_user_id,description=payload.description or None,source=payload.source,external_id=payload.external_id or None,metadata_json=payload.metadata_json,first_seen_at=now,last_seen_at=now,created_by=self.user.user_id,updated_by=self.user.user_id)
                saved_tags=await self.repository.set_tags(row,self.user.user_id,tag_pairs)
                summary={"asset_type":row.asset_type,"criticality":row.criticality,"environment":row.environment,"tag_count":len(saved_tags),"has_owner":bool(row.owner_user_id)}
                await self.repository.add_audit(row,self.user.user_id,"asset.created",after=summary)
        except IntegrityError as exc:
            raise HTTPException(status_code=409,detail="An asset with this type and identifier already exists in the workspace") from exc
        return await self._dict(row,owner,0)

    async def update(self,workspace_id,asset_id,payload:AssetUpdate):
        try:
            async with self.session.begin():
                row=await self.repository.get_asset(workspace_id,asset_id,for_update=True)
                if row is None:raise self.missing()
                self.check_version(row,payload.version); fields=payload.model_fields_set-{"version"}; before={}; after={}
                if "owner_user_id" in fields and not await self._can_manage(workspace_id):raise HTTPException(status_code=403,detail="asset:manage permission required to change ownership")
                owner=await self._owner(workspace_id,payload.owner_user_id) if "owner_user_id" in fields else (await self.repository.owner(workspace_id,row.owner_user_id) if row.owner_user_id else None)
                if "canonical_identifier" in fields:
                    canonical,normalized=normalize_identifier(row.asset_type,payload.canonical_identifier)
                    if await self.repository.duplicate(workspace_id,row.asset_type,normalized,row.id):raise HTTPException(status_code=409,detail="An asset with this type and identifier already exists in the workspace")
                    before["identifier"]={"changed":True};after["identifier"]={"changed":True};row.canonical_identifier=canonical;row.normalized_identifier=normalized
                for field in fields-{"canonical_identifier","tags","metadata_json"}:
                    value=getattr(payload,field); value=value.value if hasattr(value,"value") else value; old=getattr(row,field)
                    if old!=value:
                        safe=field in {"criticality","environment","owner_user_id"};before[field]=str(old) if safe and old is not None else ({"changed":True} if not safe else None);after[field]=str(value) if safe and value is not None else ({"changed":True} if not safe else None);setattr(row,field,value or None if field=="description" else value)
                if "metadata_json" in fields and row.metadata_json!=payload.metadata_json: before["metadata_json"]={"changed":True};after["metadata_json"]={"changed":True};row.metadata_json=payload.metadata_json
                if "tags" in fields:
                    old_tags=[tag.normalized_name for tag in await self.repository.tags(row.id)]; pairs=list(dict((normalize_tag(tag)[1],normalize_tag(tag)) for tag in payload.tags).values()); new_tags=[pair[1] for pair in pairs]
                    if sorted(old_tags)!=sorted(new_tags):before["tags"]={"count":len(old_tags)};after["tags"]={"count":len(new_tags)};await self.repository.set_tags(row,self.user.user_id,pairs)
                if not after:return await self._dict(row,owner,len(await self.repository.related_findings(workspace_id,row.id)))
                self.repository.touch(row,self.user.user_id); await self.repository.add_audit(row,self.user.user_id,"asset.updated",before=before,after=after,metadata={"changed_fields":sorted(after)})
                for field,action in (("owner_user_id","asset.owner_changed"),("criticality","asset.criticality_changed"),("environment","asset.environment_changed"),("tags","asset.tags_changed")):
                    if field in after:await self.repository.add_audit(row,self.user.user_id,action,before={field:before[field]},after={field:after[field]})
        except IntegrityError as exc:raise HTTPException(status_code=409,detail="An asset with this type and identifier already exists in the workspace") from exc
        return await self._dict(row,owner,len(await self.repository.related_findings(workspace_id,row.id)))

    async def set_active(self,workspace_id,asset_id,version,active):
        async with self.session.begin():
            row=await self.repository.get_asset(workspace_id,asset_id,for_update=True)
            if row is None:raise self.missing()
            self.check_version(row,version)
            if row.is_active==active:return await self._dict(row,None,len(await self.repository.related_findings(workspace_id,row.id)))
            row.is_active=active;self.repository.touch(row,self.user.user_id);await self.repository.add_audit(row,self.user.user_id,"asset.activated" if active else "asset.deactivated",before={"is_active":not active},after={"is_active":active})
        owner=await self.repository.owner(workspace_id,row.owner_user_id) if row.owner_user_id else None
        return await self._dict(row,owner,len(await self.repository.related_findings(workspace_id,row.id)))

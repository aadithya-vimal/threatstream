from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.tenancy import require_workspace_permission
from app.core.security import AuthenticatedPrincipal
from app.database.session import get_db_session
from app.domains.assets.schemas import AssetCreate, AssetCriticality, AssetDetail, AssetEnvironment, AssetOwner, AssetPage, AssetSummary, AssetType, AssetUpdate, AssetVersion, RelatedFinding
from app.domains.assets.service import AssetsService

router=APIRouter()
ReadUser=Annotated[AuthenticatedPrincipal,Depends(require_workspace_permission("asset:read"))]
WriteUser=Annotated[AuthenticatedPrincipal,Depends(require_workspace_permission("asset:write"))]
ManageUser=Annotated[AuthenticatedPrincipal,Depends(require_workspace_permission("asset:manage"))]
Session=Annotated[AsyncSession,Depends(get_db_session)]


@router.get("/workspaces/{workspace_id}/assets",response_model=AssetPage)
async def list_assets(workspace_id:UUID,user:ReadUser,session:Session,page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),asset_type:list[AssetType]|None=Query(None),criticality:list[AssetCriticality]|None=Query(None),environment:list[AssetEnvironment]|None=Query(None),active:bool|None=None,owner_user_id:UUID|None=None,source:str|None=Query(None,max_length=120),tag:list[str]|None=Query(None,max_length=50),search:str|None=Query(None,max_length=200),sort:Literal["name","asset_type","criticality","environment","first_seen_at","last_seen_at","created_at","updated_at","related_findings_count"]="updated_at",direction:Literal["asc","desc"]="desc"):
    return await AssetsService(session,user).list(workspace_id,page=page,page_size=page_size,asset_types=[v.value for v in asset_type or []],criticalities=[v.value for v in criticality or []],environments=[v.value for v in environment or []],active=active,owner_user_id=owner_user_id,source=source,tags=tag or [],search=search,sort=sort,direction=direction)


@router.post("/workspaces/{workspace_id}/assets",response_model=AssetSummary,status_code=status.HTTP_201_CREATED)
async def create_asset(workspace_id:UUID,payload:AssetCreate,user:WriteUser,session:Session):return await AssetsService(session,user).create(workspace_id,payload)


@router.get("/workspaces/{workspace_id}/assets/owners",response_model=list[AssetOwner])
async def list_asset_owners(workspace_id:UUID,user:ReadUser,session:Session):return await AssetsService(session,user).owners(workspace_id)


@router.get("/workspaces/{workspace_id}/assets/{asset_id}",response_model=AssetDetail)
async def get_asset(workspace_id:UUID,asset_id:UUID,user:ReadUser,session:Session):return await AssetsService(session,user).detail(workspace_id,asset_id)


@router.patch("/workspaces/{workspace_id}/assets/{asset_id}",response_model=AssetSummary)
async def update_asset(workspace_id:UUID,asset_id:UUID,payload:AssetUpdate,user:WriteUser,session:Session):return await AssetsService(session,user).update(workspace_id,asset_id,payload)


@router.post("/workspaces/{workspace_id}/assets/{asset_id}/activate",response_model=AssetSummary)
async def activate_asset(workspace_id:UUID,asset_id:UUID,payload:AssetVersion,user:ManageUser,session:Session):return await AssetsService(session,user).set_active(workspace_id,asset_id,payload.version,True)


@router.post("/workspaces/{workspace_id}/assets/{asset_id}/deactivate",response_model=AssetSummary)
async def deactivate_asset(workspace_id:UUID,asset_id:UUID,payload:AssetVersion,user:ManageUser,session:Session):return await AssetsService(session,user).set_active(workspace_id,asset_id,payload.version,False)


@router.get("/workspaces/{workspace_id}/assets/{asset_id}/findings",response_model=list[RelatedFinding])
async def asset_findings(workspace_id:UUID,asset_id:UUID,user:ReadUser,session:Session):return (await AssetsService(session,user).detail(workspace_id,asset_id))["related_findings"]

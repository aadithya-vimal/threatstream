from datetime import UTC,datetime
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import AuthenticatedPrincipal
from app.database.repositories import ScansRepository
from app.domains.scans.adapters import scanner_registry
from app.domains.scans.schemas import ScanJobPage,ScanProfileCreate,ScanProfileUpdate

def profile_dict(row,count=0,targets=None):return {"id":row.id,"workspace_id":row.workspace_id,"name":row.name,"description":row.description,"scanner_type":row.scanner_type,"configuration_json":row.configuration_json,"is_enabled":row.is_enabled,"version":row.version,"target_count":count,"target_asset_ids":[item[0].asset_id for item in targets or []],"targets":[target_dict(link,asset) for link,asset in targets or []],"created_at":row.created_at,"updated_at":row.updated_at}
def target_dict(row,asset=None):return {"id":getattr(row,"id",None),"asset_id":row.asset_id,"asset_name":getattr(asset,"name",None),"asset_type":getattr(row,"asset_type",getattr(asset,"asset_type",None)),"normalized_target":getattr(row,"normalized_target",getattr(asset,"normalized_identifier",None)),"execution_status":getattr(row,"execution_status",None),"started_at":getattr(row,"started_at",None),"completed_at":getattr(row,"completed_at",None),"error_summary":getattr(row,"error_summary",None),"result_count":getattr(row,"result_count",0)}
def job_dict(row,profile_name=None,email=None,targets=None):return {"id":row.id,"workspace_id":row.workspace_id,"profile_id":row.profile_id,"profile_name":profile_name,"scanner_type":row.scanner_type,"status":row.status,"requested_by":row.requested_by,"requested_by_email":email,"started_at":row.started_at,"completed_at":row.completed_at,"cancelled_at":row.cancelled_at,"failure_code":row.failure_code,"failure_message":row.failure_message,"target_count":row.target_count,"processed_target_count":row.processed_target_count,"findings_created_count":row.findings_created_count,"findings_updated_count":row.findings_updated_count,"findings_reopened_count":row.findings_reopened_count,"findings_unchanged_count":row.findings_unchanged_count,"raw_result_count":row.raw_result_count,"version":row.version,"created_at":row.created_at,"updated_at":row.updated_at,"targets":targets or []}

class ScansService:
 def __init__(self,session:AsyncSession,user:AuthenticatedPrincipal):self.session=session;self.user=user;self.repo=ScansRepository(session)
 async def definitions(self):return [{"scanner_type":d.scanner_type,"display_name":d.display_name,"supported_asset_types":list(d.supported_asset_types),"execution_capability":d.execution_capability,"adapter_version":d.adapter_version,"parser_version":d.parser_version,"active":d.active,"configuration_schema":d.configuration_schema} for d in scanner_registry.definitions()]
 async def health(self,scanner_type):
  try:adapter=scanner_registry.resolve(scanner_type)
  except ValueError as exc:raise HTTPException(404,str(exc))
  return {"scanner_type":scanner_type,**await adapter.health_check()}
 async def profiles(self,w):
  result=[]
  for row,count in await self.repo.profiles(w):result.append(profile_dict(row,count,await self.repo.profile_targets(w,row.id)))
  return result
 async def profile(self,w,p):
  row=await self.repo.profile(w,p)
  if not row:raise HTTPException(404,"Scan profile not found")
  targets=await self.repo.profile_targets(w,p);return profile_dict(row,len(targets),targets)
 async def create_profile(self,w,payload:ScanProfileCreate):
  try:adapter=scanner_registry.resolve(payload.scanner_type);configuration=adapter.validate_profile(payload.configuration_json)
  except ValueError as exc:
   raise HTTPException(422,str(exc))
  try:
   async with self.session.begin():
    org=await self.repo.workspace_org(w)
    if not org:raise HTTPException(404,"Workspace not found")
    row=await self.repo.create_profile(workspace_id=w,organization_id=org,name=payload.name,description=payload.description,scanner_type=payload.scanner_type,configuration_json=configuration,is_enabled=payload.is_enabled,created_by=self.user.user_id,updated_by=self.user.user_id);await self.repo.add_audit(row,self.user.user_id,"scan_profile.created","scan_profile",{"scanner_type":row.scanner_type,"enabled":row.is_enabled})
  except IntegrityError as exc:raise HTTPException(409,"A scan profile with this name already exists") from exc
  return profile_dict(row)
 async def update_profile(self,w,p,payload:ScanProfileUpdate):
  async with self.session.begin():
   row=await self.repo.profile(w,p,True)
   if not row:raise HTTPException(404,"Scan profile not found")
   if row.version!=payload.version:raise HTTPException(409,"Scan profile changed since it was loaded")
   changed=[]
   for field in payload.model_fields_set-{"version"}:
    value=getattr(payload,field)
    if field=="configuration_json":value=scanner_registry.resolve(row.scanner_type).validate_profile(value)
    if getattr(row,field)!=value:setattr(row,field,value);changed.append(field)
   if changed:row.version+=1;row.updated_by=self.user.user_id;row.updated_at=datetime.now(UTC);await self.repo.add_audit(row,self.user.user_id,"scan_profile.updated","scan_profile",{"changed_fields":changed})
  return await self.profile(w,p)
 async def disable_profile(self,w,p):
  async with self.session.begin():
   row=await self.repo.profile(w,p,True)
   if not row:raise HTTPException(404,"Scan profile not found")
   if row.is_enabled:row.is_enabled=False;row.version+=1;row.updated_by=self.user.user_id;await self.repo.add_audit(row,self.user.user_id,"scan_profile.updated","scan_profile",{"changed_fields":["is_enabled"]})
 async def add_targets(self,w,p,ids):
  async with self.session.begin():
   profile=await self.repo.profile(w,p,True)
   if not profile:raise HTTPException(404,"Scan profile not found")
   assets=await self.repo.assets(w,list(dict.fromkeys(ids)))
   if len(assets)!=len(set(ids)):raise HTTPException(422,"Every target must be an active Asset in this workspace")
   adapter=scanner_registry.resolve(profile.scanner_type);existing={link.asset_id for link,_ in await self.repo.profile_targets(w,p)}
   for asset in assets:
    try:adapter.validate_asset(asset.asset_type)
    except ValueError as exc:raise HTTPException(422,str(exc))
    if asset.id not in existing:await self.repo.add_target(p,asset.id,w,self.user.user_id);await self.repo.add_audit(profile,self.user.user_id,"scan_profile.target_added","scan_profile",{"asset_id":str(asset.id),"asset_type":asset.asset_type})
  return await self.profile(w,p)
 async def remove_target(self,w,p,a):
  async with self.session.begin():
   profile=await self.repo.profile(w,p,True)
   if not profile:raise HTTPException(404,"Scan profile not found")
   if await self.repo.remove_target(p,a):await self.repo.add_audit(profile,self.user.user_id,"scan_profile.target_removed","scan_profile",{"asset_id":str(a)})
 async def queue(self,w,p):
  async with self.session.begin():
   profile=await self.repo.profile(w,p)
   if not profile or not profile.is_enabled:raise HTTPException(422,"Scan profile is missing or disabled")
   scanner_type=profile.scanner_type
  adapter=scanner_registry.resolve(scanner_type);health=await adapter.health_check()
  if not health["available"]:raise HTTPException(503,"Scanner is unavailable on this runtime")
  try:
   async with self.session.begin():
    profile=await self.repo.profile(w,p,True)
    if await self.repo.active_job(w,p):raise HTTPException(409,"This profile already has an active scan job")
    targets=await self.repo.profile_targets(w,p)
    if not targets:raise HTTPException(422,"Scan profile has no targets")
    job,_=await self.repo.create_job(profile,self.user.user_id,targets);await self.repo.add_audit(job,self.user.user_id,"scan_job.queued","scan_job",{"scanner_type":job.scanner_type,"target_count":job.target_count})
  except IntegrityError as exc:raise HTTPException(409,"This profile already has an active scan job") from exc
  return job_dict(job)
 async def jobs(self,w,**filters):
  rows,total=await self.repo.list_jobs(w,**filters);return ScanJobPage.create([job_dict(j,n,e) for j,n,e in rows],filters["page"],filters["page_size"],total)
 async def job(self,w,j):
  row=await self.repo.job(w,j)
  if not row:raise HTTPException(404,"Scan job not found")
  targets=await self.repo.job_targets(j);return job_dict(row,targets=[target_dict(t) for t in targets])
 async def results(self,w,j):
  if not await self.repo.job(w,j):raise HTTPException(404,"Scan job not found")
  rows=await self.repo.safe_results(w,j);return [{"id":r.id,"job_id":r.job_id,"job_target_id":r.job_target_id,"finding_id":finding_id,"scanner_type":r.scanner_type,"adapter_version":r.adapter_version,"parser_version":r.parser_version,"payload_hash":r.payload_hash,"received_at":r.received_at,"processed_at":r.processed_at,"processing_status":r.processing_status,"processing_error":r.processing_error,"summary":{"template_id":r.payload_json.get("template-id"),"matched_at":r.payload_json.get("matched-at"),"severity":(r.payload_json.get("info") or {}).get("severity") if isinstance(r.payload_json.get("info"),dict) else None}} for r,finding_id in rows]
 async def cancel(self,w,j):
  async with self.session.begin():
   row=await self.repo.job(w,j,True)
   if not row:raise HTTPException(404,"Scan job not found")
   if row.status not in {"queued","claimed","running"}:raise HTTPException(409,"This scan job can no longer be cancelled")
   row.status="cancelled";row.cancelled_at=datetime.now(UTC);row.version+=1;await self.repo.add_audit(row,self.user.user_id,"scan_job.cancelled","scan_job",{"preserved_results":row.raw_result_count})
  await scanner_registry.resolve(row.scanner_type).cancel(row.id);return job_dict(row)

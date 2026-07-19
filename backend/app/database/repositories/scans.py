import hashlib,json
from datetime import UTC,datetime
from uuid import UUID
from sqlalchemy import and_,func,or_,select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import Asset,AuditEvent,Finding,FindingActivity,FindingOccurrence,RawScanResult,ScanJob,ScanJobTarget,ScanProfile,ScanProfileTarget,User,Workspace

ACTIVE_JOB_STATUSES=("queued","claimed","running","processing")
class ScansRepository:
 def __init__(self,session:AsyncSession):self.session=session
 async def workspace_org(self,w):return await self.session.scalar(select(Workspace.organization_id).where(Workspace.id==w))
 async def profiles(self,w):
  count=select(func.count(ScanProfileTarget.asset_id)).where(ScanProfileTarget.profile_id==ScanProfile.id).correlate(ScanProfile).scalar_subquery();return list((await self.session.execute(select(ScanProfile,count.label("target_count")).where(ScanProfile.workspace_id==w).order_by(ScanProfile.name))).all())
 async def profile(self,w,p,lock=False):
  q=select(ScanProfile).where(ScanProfile.workspace_id==w,ScanProfile.id==p);return await self.session.scalar(q.with_for_update() if lock else q)
 async def create_profile(self,**v):r=ScanProfile(**v);self.session.add(r);await self.session.flush();return r
 async def profile_targets(self,w,p):
  return list((await self.session.execute(select(ScanProfileTarget,Asset).join(Asset,Asset.id==ScanProfileTarget.asset_id).where(ScanProfileTarget.workspace_id==w,ScanProfileTarget.profile_id==p).order_by(Asset.name))).all())
 async def assets(self,w,ids):return list((await self.session.scalars(select(Asset).where(Asset.workspace_id==w,Asset.id.in_(ids),Asset.is_active==True))).all())
 async def add_target(self,p,a,w,u):self.session.add(ScanProfileTarget(profile_id=p,asset_id=a,workspace_id=w,created_by=u));await self.session.flush()
 async def remove_target(self,p,a):
  row=await self.session.scalar(select(ScanProfileTarget).where(ScanProfileTarget.profile_id==p,ScanProfileTarget.asset_id==a));
  if row:await self.session.delete(row)
  return bool(row)
 async def active_job(self,w,p):return await self.session.scalar(select(ScanJob.id).where(ScanJob.workspace_id==w,ScanJob.profile_id==p,ScanJob.status.in_(ACTIVE_JOB_STATUSES)).limit(1))
 async def create_job(self,profile,user,targets):
  job=ScanJob(workspace_id=profile.workspace_id,organization_id=profile.organization_id,profile_id=profile.id,scanner_type=profile.scanner_type,requested_by=user,target_count=len(targets));self.session.add(job);await self.session.flush()
  rows=[]
  for _,asset in targets:
   row=ScanJobTarget(job_id=job.id,asset_id=asset.id,workspace_id=profile.workspace_id,normalized_target=asset.normalized_identifier,asset_type=asset.asset_type);self.session.add(row);rows.append(row)
  await self.session.flush();return job,rows
 async def claim(self,job_id,worker):
  job=await self.session.scalar(select(ScanJob).where(ScanJob.id==job_id,ScanJob.status=="queued").with_for_update(skip_locked=True))
  if not job:return None
  job.status="claimed";job.claimed_by=worker;job.version+=1;job.updated_at=datetime.now(UTC);await self.session.flush();return job
 async def job(self,w,j,lock=False):
  q=select(ScanJob).where(ScanJob.workspace_id==w,ScanJob.id==j);return await self.session.scalar(q.with_for_update() if lock else q)
 async def job_any(self,j,lock=False):
  q=select(ScanJob).where(ScanJob.id==j);return await self.session.scalar(q.with_for_update() if lock else q)
 async def job_targets(self,j):return list((await self.session.scalars(select(ScanJobTarget).where(ScanJobTarget.job_id==j).order_by(ScanJobTarget.id))).all())
 async def list_jobs(self,w,*,page,page_size,statuses,scanner_type,profile_id,asset_id,requested_by,date_from,date_to,search,sort,direction):
  c=[ScanJob.workspace_id==w]
  if statuses:c.append(ScanJob.status.in_(statuses))
  if scanner_type:c.append(ScanJob.scanner_type==scanner_type)
  if profile_id:c.append(ScanJob.profile_id==profile_id)
  if requested_by:c.append(ScanJob.requested_by==requested_by)
  if date_from:c.append(ScanJob.created_at>=date_from)
  if date_to:c.append(ScanJob.created_at<=date_to)
  if asset_id:c.append(ScanJob.id.in_(select(ScanJobTarget.job_id).where(ScanJobTarget.asset_id==asset_id)))
  if search:c.append(or_(ScanProfile.name.ilike(f"%{search.strip()}%"),ScanJob.failure_code.ilike(f"%{search.strip()}%")))
  total=int(await self.session.scalar(select(func.count()).select_from(ScanJob).join(ScanProfile,ScanProfile.id==ScanJob.profile_id).where(*c))or 0);columns={"created_at":ScanJob.created_at,"updated_at":ScanJob.updated_at,"status":ScanJob.status,"completed_at":ScanJob.completed_at};order=columns[sort];order=order.asc() if direction=="asc" else order.desc();rows=await self.session.execute(select(ScanJob,ScanProfile.name,User.email).join(ScanProfile,ScanProfile.id==ScanJob.profile_id).outerjoin(User,User.id==ScanJob.requested_by).where(*c).order_by(order,ScanJob.id).offset((page-1)*page_size).limit(page_size));return list(rows.all()),total
 async def raw_results(self,w,j,limit=100):
  return list((await self.session.scalars(select(RawScanResult).join(ScanJob,ScanJob.id==RawScanResult.job_id).where(ScanJob.workspace_id==w,RawScanResult.job_id==j).order_by(RawScanResult.received_at).limit(limit))).all())
 async def safe_results(self,w,j,limit=100):
  return list((await self.session.execute(select(RawScanResult,FindingOccurrence.finding_id).join(ScanJob,ScanJob.id==RawScanResult.job_id).outerjoin(FindingOccurrence,FindingOccurrence.raw_result_id==RawScanResult.id).where(ScanJob.workspace_id==w,RawScanResult.job_id==j).order_by(RawScanResult.received_at).limit(limit))).all())
 async def add_raw(self,job,target,payload,adapter_version,parser_version):
  encoded=json.dumps(payload,sort_keys=True,separators=(",",":")).encode();h=hashlib.sha256(encoded).hexdigest();row=RawScanResult(job_id=job.id,job_target_id=target.id,scanner_type=job.scanner_type,adapter_version=adapter_version,parser_version=parser_version,payload_json=payload,payload_hash=h);self.session.add(row);await self.session.flush();return row
 async def finding_by_fingerprint(self,w,fingerprint):return await self.session.scalar(select(Finding).where(Finding.workspace_id==w,Finding.scanner_fingerprint==fingerprint).with_for_update())
 async def add_audit(self,job_or_profile,actor,action,target_type,summary=None):self.session.add(AuditEvent(organization_id=job_or_profile.organization_id,workspace_id=job_or_profile.workspace_id,actor_id=actor,action=action,target_type=target_type,target_id=job_or_profile.id,after_summary=summary or {}))

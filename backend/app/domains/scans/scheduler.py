from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from apscheduler.triggers.cron import CronTrigger
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.database.models import ScanSchedule
from app.database.repositories import ScansRepository
from app.database.session import get_session_factory

MINIMUM_INTERVAL = timedelta(minutes=15)


def validate_timezone(name):
    try: return ZoneInfo(name)
    except ZoneInfoNotFoundError as exc: raise ValueError("Timezone must be a valid IANA timezone") from exc


def cron_trigger(expression, timezone):
    if len(expression.split()) != 5 or expression.startswith("@"): raise ValueError("Cron must contain exactly five fields")
    try: trigger = CronTrigger.from_crontab(expression, timezone=validate_timezone(timezone))
    except ValueError as exc: raise ValueError("Cron expression is invalid") from exc
    start = datetime.now(UTC); first = trigger.get_next_fire_time(None, start); second = trigger.get_next_fire_time(first, first)
    if not first or not second or second.astimezone(UTC) - first.astimezone(UTC) < MINIMUM_INTERVAL: raise ValueError("Cron schedule cannot run more often than every 15 minutes")
    return trigger


def next_run(schedule_type, interval_minutes, cron_expression, timezone, after=None):
    after = after or datetime.now(UTC)
    if schedule_type == "interval": return after + timedelta(minutes=interval_minutes)
    trigger = cron_trigger(cron_expression, timezone); value = trigger.get_next_fire_time(None, after)
    if not value: raise ValueError("Cron schedule has no future run")
    return value.astimezone(UTC)

def validate_schedule_shape(schedule_type, interval_minutes, cron_expression, timezone):
    validate_timezone(timezone)
    if schedule_type == "interval":
        if interval_minutes is None or cron_expression is not None:raise ValueError("Interval schedules require only interval_minutes")
    elif not cron_expression or interval_minutes is not None:raise ValueError("Cron schedules require only cron_expression")
    return next_run(schedule_type,interval_minutes,cron_expression,timezone)


class ScheduleService:
    def __init__(self, session, user): self.session=session; self.user=user; self.repo=ScansRepository(session)
    @staticmethod
    def serialize(row, profile_name=None, scanner_type=None):
        return {"id":row.id,"workspace_id":row.workspace_id,"profile_id":row.profile_id,"profile_name":profile_name,"scanner_type":scanner_type,"name":row.name,"schedule_type":row.schedule_type,"cron_expression":row.cron_expression,"interval_minutes":row.interval_minutes,"timezone":row.timezone,"is_enabled":row.is_enabled,"next_run_at":row.next_run_at,"last_run_at":row.last_run_at,"last_job_id":row.last_job_id,"last_outcome":row.last_outcome,"misfire_policy":row.misfire_policy,"max_catch_up_runs":row.max_catch_up_runs,"version":row.version,"created_at":row.created_at,"updated_at":row.updated_at}
    async def list(self, workspace_id, **filters):
        rows,total=await self.repo.schedules(workspace_id,**filters);from app.domains.scans.schemas import ScanSchedulePage
        return ScanSchedulePage.create([self.serialize(*row) for row in rows],filters["page"],filters["page_size"],total)
    async def detail(self, workspace_id, schedule_id):
        row=await self.repo.schedule(workspace_id,schedule_id)
        if not row:raise HTTPException(404,"Scan schedule not found")
        profile=await self.repo.profile(workspace_id,row.profile_id);return self.serialize(row,profile.name,profile.scanner_type)
    async def create(self, workspace_id, payload):
        try:due=validate_schedule_shape(payload.schedule_type,payload.interval_minutes,payload.cron_expression,payload.timezone)
        except ValueError as exc:raise HTTPException(422,str(exc)) from exc
        try:
            async with self.session.begin():
                profile=await self.repo.profile(workspace_id,payload.profile_id)
                if not profile:raise HTTPException(422,"Profile must belong to this workspace")
                row=ScanSchedule(organization_id=profile.organization_id,workspace_id=workspace_id,profile_id=profile.id,next_run_at=due,created_by=self.user.user_id,updated_by=self.user.user_id,**payload.model_dump());self.session.add(row);await self.session.flush();await self.repo.add_audit(row,self.user.user_id,"scan_schedule.created","scan_schedule",{"schedule_type":row.schedule_type,"enabled":row.is_enabled})
        except IntegrityError as exc:raise HTTPException(409,"A scan schedule with this name already exists") from exc
        return self.serialize(row,profile.name,profile.scanner_type)
    async def update(self, workspace_id, schedule_id, payload):
        async with self.session.begin():
            row=await self.repo.schedule(workspace_id,schedule_id,True)
            if not row:raise HTTPException(404,"Scan schedule not found")
            if row.version!=payload.version:raise HTTPException(409,"Scan schedule changed since it was loaded")
            values={key:getattr(payload,key) for key in payload.model_fields_set-{"version"}}
            for key,value in values.items():setattr(row,key,value)
            if "profile_id" in values:
                profile=await self.repo.profile(workspace_id,row.profile_id)
                if not profile:raise HTTPException(422,"Profile must belong to this workspace")
                row.organization_id=profile.organization_id
            try:row.next_run_at=validate_schedule_shape(row.schedule_type,row.interval_minutes,row.cron_expression,row.timezone)
            except ValueError as exc:raise HTTPException(422,str(exc)) from exc
            row.version+=1;row.updated_by=self.user.user_id;row.updated_at=datetime.now(UTC);await self.repo.add_audit(row,self.user.user_id,"scan_schedule.updated","scan_schedule",{"changed_fields":sorted(values)})
        return await self.detail(workspace_id,schedule_id)
    async def set_enabled(self, workspace_id, schedule_id, enabled, version):
        async with self.session.begin():
            row=await self.repo.schedule(workspace_id,schedule_id,True)
            if not row:raise HTTPException(404,"Scan schedule not found")
            if row.version!=version:raise HTTPException(409,"Scan schedule changed since it was loaded")
            row.is_enabled=enabled;row.next_run_at=next_run(row.schedule_type,row.interval_minutes,row.cron_expression,row.timezone) if enabled else row.next_run_at;row.version+=1;row.updated_by=self.user.user_id;await self.repo.add_audit(row,self.user.user_id,"scan_schedule.enabled" if enabled else "scan_schedule.disabled","scan_schedule",{"enabled":enabled})
        return await self.detail(workspace_id,schedule_id)
    async def disable(self,workspace_id,schedule_id):
        row=await self.repo.schedule(workspace_id,schedule_id)
        if not row:raise HTTPException(404,"Scan schedule not found")
        return await self.set_enabled(workspace_id,schedule_id,False,row.version)


class Scheduler:
    def __init__(self,session_factory=None):self.factory=session_factory or get_session_factory()
    async def tick(self):
        queued=skipped=0
        async with self.factory() as session:
            repo=ScansRepository(session)
            async with session.begin():
                now=datetime.now(UTC)
                for schedule in await repo.due_schedules():
                    profile=await repo.profile(schedule.workspace_id,schedule.profile_id);due=schedule.next_run_at
                    future=next_run(schedule.schedule_type,schedule.interval_minutes,schedule.cron_expression,schedule.timezone,now)
                    if not profile or not profile.is_enabled or not schedule.is_enabled:
                        schedule.next_run_at=future;schedule.last_outcome="skipped_disabled";continue
                    if schedule.misfire_policy=="skip" and now-due>timedelta(minutes=1):
                        schedule.last_run_at=due;schedule.next_run_at=future;schedule.last_outcome="skipped_misfire";skipped+=1;await repo.add_audit(schedule,schedule.updated_by,"scan_schedule.occurrence_skipped","scan_schedule",{"reason":"misfire"});continue
                    if await repo.active_job(schedule.workspace_id,schedule.profile_id):
                        schedule.last_run_at=due;schedule.next_run_at=future;schedule.last_outcome="skipped_active_job";skipped+=1;await repo.add_audit(schedule,schedule.updated_by,"scan_schedule.occurrence_skipped","scan_schedule",{"reason":"active_job"});continue
                    targets=await repo.profile_targets(schedule.workspace_id,schedule.profile_id)
                    if not targets:
                        schedule.last_run_at=due;schedule.next_run_at=future;schedule.last_outcome="skipped_no_targets";skipped+=1;continue
                    job,_=await repo.create_job(profile,schedule.updated_by,targets,origin="schedule",schedule_id=schedule.id,scheduled_for=due)
                    schedule.last_run_at=due;schedule.next_run_at=future;schedule.last_job_id=job.id;schedule.last_outcome="queued";schedule.version+=1;queued+=1;await repo.add_audit(job,schedule.updated_by,"scan_schedule.job_queued","scan_job",{"schedule_id":str(schedule.id),"scheduled_for":due.isoformat()})
        return {"queued":queued,"skipped":skipped}

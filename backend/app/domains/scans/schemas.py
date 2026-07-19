from datetime import datetime
from math import ceil
from typing import Any
from uuid import UUID
from pydantic import BaseModel,ConfigDict,Field,field_validator,model_validator
from typing import Literal

class ScannerDefinitionResponse(BaseModel):scanner_type:str;display_name:str;supported_asset_types:list[str];execution_capability:str;adapter_version:str;parser_version:str;active:bool;configuration_schema:dict[str,Any]
class ScannerHealth(BaseModel):scanner_type:str;available:bool;version:str|None=None;message:str
class ScanProfileCreate(BaseModel):
    model_config=ConfigDict(extra="forbid");name:str=Field(min_length=2,max_length=160);description:str|None=Field(None,max_length=5000);scanner_type:str=Field(pattern="^nuclei$");configuration_json:dict[str,Any]=Field(default_factory=dict);is_enabled:bool=True
    @field_validator("name","description")
    @classmethod
    def trim(cls,v):return v.strip() if v is not None else None
class ScanProfileUpdate(BaseModel):
    model_config=ConfigDict(extra="forbid");version:int=Field(ge=1);name:str|None=Field(None,min_length=2,max_length=160);description:str|None=Field(None,max_length=5000);configuration_json:dict[str,Any]|None=None;is_enabled:bool|None=None
    @model_validator(mode="after")
    def changed(self):
        if not(self.model_fields_set-{"version"}):raise ValueError("At least one profile field is required")
        return self
class TargetMutation(BaseModel):model_config=ConfigDict(extra="forbid");asset_ids:list[UUID]=Field(min_length=1,max_length=100)
class VersionPayload(BaseModel):model_config=ConfigDict(extra="forbid");version:int=Field(ge=1)
class ScanTargetSummary(BaseModel):id:UUID|None=None;asset_id:UUID;asset_name:str|None=None;asset_type:str;normalized_target:str;execution_status:str|None=None;started_at:datetime|None=None;completed_at:datetime|None=None;error_summary:str|None=None;result_count:int=0
class ScanProfileSummary(BaseModel):id:UUID;workspace_id:UUID;name:str;description:str|None=None;scanner_type:str;configuration_json:dict[str,Any];is_enabled:bool;version:int;target_count:int=0;target_asset_ids:list[UUID]=Field(default_factory=list);targets:list[ScanTargetSummary]=Field(default_factory=list);created_at:datetime;updated_at:datetime
class ScanJobSummary(BaseModel):id:UUID;workspace_id:UUID;profile_id:UUID;profile_name:str|None=None;scanner_type:str;status:str;requested_by:UUID;requested_by_email:str|None=None;started_at:datetime|None=None;completed_at:datetime|None=None;cancelled_at:datetime|None=None;failure_code:str|None=None;failure_message:str|None=None;target_count:int;processed_target_count:int;findings_created_count:int;findings_updated_count:int;findings_reopened_count:int;findings_unchanged_count:int;raw_result_count:int;version:int;created_at:datetime;updated_at:datetime;targets:list[ScanTargetSummary]=Field(default_factory=list);attempt_count:int=0;max_attempts:int=3;next_retry_at:datetime|None=None;last_failure_code:str|None=None;last_failure_summary:str|None=None;cancellation_requested_at:datetime|None=None;last_heartbeat_at:datetime|None=None;lease_expires_at:datetime|None=None;stalled:bool=False;origin:str="manual";schedule_id:UUID|None=None;scheduled_for:datetime|None=None
class ScanJobPage(BaseModel):
    items:list[ScanJobSummary];page:int;page_size:int;total:int;pages:int
    @classmethod
    def create(cls,items,page,page_size,total):return cls(items=items,page=page,page_size=page_size,total=total,pages=ceil(total/page_size) if total else 0)
class SafeRawResult(BaseModel):id:UUID;job_id:UUID;job_target_id:UUID;finding_id:UUID|None=None;scanner_type:str;adapter_version:str;parser_version:str;payload_hash:str;received_at:datetime;processed_at:datetime|None=None;processing_status:str;processing_error:str|None=None;summary:dict[str,Any]

class ScanScheduleCreate(BaseModel):
    model_config=ConfigDict(extra="forbid");profile_id:UUID;name:str=Field(min_length=2,max_length=160);schedule_type:Literal["interval","cron"];cron_expression:str|None=Field(None,max_length=160);interval_minutes:int|None=Field(None,ge=15,le=525600);timezone:str=Field("UTC",min_length=1,max_length=80);is_enabled:bool=True;misfire_policy:Literal["skip","run_once"]="run_once";max_catch_up_runs:int=Field(1,ge=0,le=1)
    @model_validator(mode="after")
    def shape(self):
        if self.schedule_type=="interval" and (self.interval_minutes is None or self.cron_expression is not None):raise ValueError("Interval schedules require only interval_minutes")
        if self.schedule_type=="cron" and (not self.cron_expression or self.interval_minutes is not None):raise ValueError("Cron schedules require only cron_expression")
        return self
class ScanScheduleUpdate(BaseModel):
    model_config=ConfigDict(extra="forbid");version:int=Field(ge=1);profile_id:UUID|None=None;name:str|None=Field(None,min_length=2,max_length=160);schedule_type:Literal["interval","cron"]|None=None;cron_expression:str|None=Field(None,max_length=160);interval_minutes:int|None=Field(None,ge=15,le=525600);timezone:str|None=Field(None,min_length=1,max_length=80);is_enabled:bool|None=None;misfire_policy:Literal["skip","run_once"]|None=None;max_catch_up_runs:int|None=Field(None,ge=0,le=1)
    @model_validator(mode="after")
    def changed(self):
        if not(self.model_fields_set-{"version"}):raise ValueError("At least one schedule field is required")
        return self
class ScanScheduleSummary(BaseModel):id:UUID;workspace_id:UUID;profile_id:UUID;profile_name:str|None=None;scanner_type:str|None=None;name:str;schedule_type:str;cron_expression:str|None=None;interval_minutes:int|None=None;timezone:str;is_enabled:bool;next_run_at:datetime;last_run_at:datetime|None=None;last_job_id:UUID|None=None;last_outcome:str|None=None;misfire_policy:str;max_catch_up_runs:int;version:int;created_at:datetime;updated_at:datetime
class ScanSchedulePage(BaseModel):
    items:list[ScanScheduleSummary];page:int;page_size:int;total:int;pages:int
    @classmethod
    def create(cls,items,page,page_size,total):return cls(items=items,page=page,page_size=page_size,total=total,pages=ceil(total/page_size) if total else 0)
class WorkerStatus(BaseModel):status:Literal["healthy","degraded","unavailable"];last_observed_worker_heartbeat:datetime|None=None;active_lease_count:int;queued_job_count:int;expired_lease_count:int

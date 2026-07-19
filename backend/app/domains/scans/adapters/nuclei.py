import asyncio,hashlib,json,re
from typing import Any
from uuid import UUID
from pydantic import BaseModel,ConfigDict,Field,field_validator
from app.domains.assets.metadata import redact_metadata
from app.domains.scans.adapters.base import ExecutionTarget,NormalizedScanResult,ScannerAdapter,ScannerDefinition,ScannerExecutionError,ScannerUnavailableError

SAFE_VALUE=re.compile(r"^[A-Za-z0-9_.:/-]+$");MAX_OUTPUT=4*1024*1024
class NucleiConfiguration(BaseModel):
    model_config=ConfigDict(extra="forbid")
    severities:list[str]=Field(default_factory=list,max_length=5);tags:list[str]=Field(default_factory=list,max_length=30);exclude_tags:list[str]=Field(default_factory=list,max_length=30);template_ids:list[str]=Field(default_factory=list,max_length=100);rate_limit:int=Field(150,ge=1,le=1000);timeout_seconds:int=Field(10,ge=1,le=60);retries:int=Field(1,ge=0,le=3);concurrency:int=Field(10,ge=1,le=50)
    @field_validator("severities")
    @classmethod
    def severity(cls,v):
        allowed={"info","low","medium","high","critical","unknown"};values=list(dict.fromkeys(x.lower().strip() for x in v));
        if any(x not in allowed for x in values):raise ValueError("Unsupported Nuclei severity")
        return values
    @field_validator("tags","exclude_tags","template_ids")
    @classmethod
    def safe_list(cls,v):
        values=list(dict.fromkeys(x.strip() for x in v));
        if any(not x or len(x)>100 or not SAFE_VALUE.fullmatch(x) for x in values):raise ValueError("Scanner option contains unsafe characters")
        return values

class NucleiAdapter(ScannerAdapter):
    definition=ScannerDefinition("nuclei","Nuclei",("domain","subdomain","url","ip_address","host"),"local_cli","1.0","1.0",True,NucleiConfiguration.model_json_schema())
    def __init__(self):self._processes={}
    def validate_profile(self,configuration):return NucleiConfiguration.model_validate(configuration).model_dump()
    def build_execution_plan(self,target,configuration):
        c=NucleiConfiguration.model_validate(configuration);args=["nuclei","-jsonl","-target",target.normalized_target,"-no-color","-silent","-rate-limit",str(c.rate_limit),"-timeout",str(c.timeout_seconds),"-retries",str(c.retries),"-concurrency",str(c.concurrency)]
        for flag,values in (("-severity",c.severities),("-tags",c.tags),("-exclude-tags",c.exclude_tags),("-id",c.template_ids)):
            if values:args.extend([flag,",".join(values)])
        return args
    async def health_check(self):
        try:
            proc=await asyncio.create_subprocess_exec("nuclei","-version",stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE);stdout,_=await asyncio.wait_for(proc.communicate(),5)
            return {"available":proc.returncode==0,"version":stdout[:200].decode(errors="replace").strip() or None,"message":"Nuclei is available" if proc.returncode==0 else "Nuclei is unavailable"}
        except (FileNotFoundError,asyncio.TimeoutError):return {"available":False,"version":None,"message":"Nuclei CLI is not installed or not reachable"}
    async def execute_target(self,target,configuration):
        self.validate_asset(target.asset_type);args=self.build_execution_plan(target,configuration)
        try:proc=await asyncio.create_subprocess_exec(*args,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE)
        except FileNotFoundError as exc:raise ScannerUnavailableError("Nuclei CLI is unavailable") from exc
        self._processes[target.job_id]=proc
        try:
            stdout,stderr=await asyncio.wait_for(proc.communicate(),timeout=min(3600,max(30,configuration.get("timeout_seconds",10)*10)))
            if len(stdout)>MAX_OUTPUT or len(stderr)>MAX_OUTPUT:raise ScannerExecutionError("Scanner output exceeded the safe limit")
            if proc.returncode not in (0,):raise ScannerExecutionError("Scanner execution failed")
            return self.parse_output(stdout)
        except asyncio.TimeoutError as exc:
            proc.terminate()
            try:await asyncio.wait_for(proc.wait(),5)
            except asyncio.TimeoutError:proc.kill();await proc.wait()
            raise ScannerExecutionError("Scanner execution timed out") from exc
        finally:self._processes.pop(target.job_id,None)
    def parse_output(self,output):
        if len(output)>MAX_OUTPUT:raise ScannerExecutionError("Scanner output exceeded the safe limit")
        records=[]
        for line in output.splitlines():
            if not line.strip():continue
            try:value=json.loads(line)
            except (json.JSONDecodeError,UnicodeDecodeError):continue
            if isinstance(value,dict):records.append(redact_metadata(value))
        return records
    def normalize_result(self,workspace_id,target,payload):
        info=payload.get("info") if isinstance(payload.get("info"),dict) else {};template=str(payload.get("template-id") or payload.get("template") or "unknown")[:240];matcher=str(payload.get("matcher-name") or "default")[:160];location=str(payload.get("matched-at") or target.normalized_target)[:1000];severity=str(info.get("severity") or "informational").lower();severity={"info":"informational","unknown":"informational"}.get(severity,severity);severity=severity if severity in {"critical","high","medium","low","informational"} else "informational";name=str(info.get("name") or template)[:240];description=str(info.get("description") or f"Nuclei matched {template} at {location}")[:20000];remediation=str(info.get("remediation") or "")[:20000] or None;discriminator=str(payload.get("extracted-results") or "")[:500];canonical="|".join([str(workspace_id),"nuclei",str(target.asset_id),template,matcher,location.lower(),discriminator]);fingerprint=hashlib.sha256(canonical.encode()).hexdigest();evidence={"matched_at":location,"matcher_name":matcher,"extracted_results":payload.get("extracted-results",[])[:20] if isinstance(payload.get("extracted-results"),list) else []};metadata={"template_id":template,"template_url":str(payload.get("template-url") or "")[:500] or None}
        return NormalizedScanResult(name,description,severity,template,matcher,location,remediation,evidence,metadata,fingerprint)
    async def cancel(self,job_id):
        proc=self._processes.get(job_id)
        if not proc:return False
        proc.terminate();return True

from app.domains.scans.adapters.registry import scanner_registry
scanner_registry.register(NucleiAdapter())

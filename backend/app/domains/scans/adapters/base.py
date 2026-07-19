from abc import ABC,abstractmethod
from dataclasses import dataclass,field
from typing import Any
from uuid import UUID


@dataclass(frozen=True)
class ScannerDefinition:
    scanner_type:str;display_name:str;supported_asset_types:tuple[str,...];execution_capability:str;adapter_version:str;parser_version:str;active:bool;configuration_schema:dict[str,Any]=field(default_factory=dict)


@dataclass(frozen=True)
class ExecutionTarget:
    job_id:UUID;job_target_id:UUID;asset_id:UUID;asset_type:str;normalized_target:str


@dataclass(frozen=True)
class NormalizedScanResult:
    title:str;description:str;severity:str;template_id:str;matcher_name:str;matched_location:str;remediation:str|None;evidence_summary:dict[str,Any];metadata:dict[str,Any];fingerprint:str


class ScannerUnavailableError(RuntimeError):pass
class ScannerExecutionError(RuntimeError):pass


class ScannerAdapter(ABC):
    definition:ScannerDefinition
    @abstractmethod
    def validate_profile(self,configuration:dict[str,Any])->dict[str,Any]:...
    def validate_asset(self,asset_type:str)->None:
        if asset_type not in self.definition.supported_asset_types:raise ValueError(f"{self.definition.display_name} does not support {asset_type} assets")
    @abstractmethod
    def build_execution_plan(self,target:ExecutionTarget,configuration:dict[str,Any])->list[str]:...
    @abstractmethod
    async def execute_target(self,target:ExecutionTarget,configuration:dict[str,Any])->list[dict[str,Any]]:...
    @abstractmethod
    def parse_output(self,output:bytes)->list[dict[str,Any]]:...
    @abstractmethod
    def normalize_result(self,workspace_id:UUID,target:ExecutionTarget,payload:dict[str,Any])->NormalizedScanResult:...
    @abstractmethod
    async def health_check(self)->dict[str,Any]:...
    async def cancel(self,job_id:UUID)->bool:return False

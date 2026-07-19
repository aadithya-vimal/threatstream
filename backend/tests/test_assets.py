import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.domains.assets.identifiers import normalize_identifier, normalize_tag
from app.domains.assets.metadata import redact_metadata, validate_metadata
from app.domains.assets.schemas import AssetCreate, AssetUpdate
from app.domains.assets.service import AssetsService
from app.domains.findings.schemas import FindingUpdate
from app.domains.findings.service import FindingsService
from app.main import app


class Transaction:
    async def __aenter__(self): return self
    async def __aexit__(self, *_args): return None


class FakeSession:
    def begin(self): return Transaction()


def principal(): return SimpleNamespace(user_id=uuid4(),email="asset-owner@example.test",display_name="Asset Owner")


@pytest.mark.parametrize(("asset_type","raw","expected"),[
    ("domain"," Example.COM. ","example.com"),("subdomain","API.Example.COM","api.example.com"),("host","Host-01.Internal.","host-01.internal"),
    ("ip_address","2001:0db8::1","2001:db8::1"),("url","HTTPS://Example.COM:443/path?q=1#fragment","https://example.com/path?q=1"),
    ("repository","https://github.com/Owner/Repo.git","github:owner/repo"),("container_image","GHCR.IO/Owner/App:Release","ghcr.io/owner/app:Release"),
    ("cloud_account"," AWS: 123456789012 ","aws: 123456789012"),("kubernetes_cluster"," Production West ","production west"),("custom"," Stable Identifier ","stable identifier"),
])
def test_identifier_normalization_for_supported_asset_types(asset_type,raw,expected):
    canonical,normalized=normalize_identifier(asset_type,raw);assert canonical==expected;assert normalized==expected


@pytest.mark.parametrize(("asset_type","raw"),[("domain","https://example.com/path"),("ip_address","999.1.1.1"),("url","javascript:alert(1)"),("repository","unknown.example/owner/repo"),("container_image","Bad Image!")])
def test_invalid_identifiers_are_rejected(asset_type,raw):
    with pytest.raises(HTTPException) as exc:normalize_identifier(asset_type,raw)
    assert exc.value.status_code==422


def test_tags_and_metadata_are_normalized_bounded_and_redacted():
    assert normalize_tag("  Internet Facing  ")==("Internet Facing","internet facing")
    assert redact_metadata({"region":"ap-south-1","api_key":"do-not-return","nested":{"password":"hidden"}})=={"region":"ap-south-1","api_key":"[REDACTED]","nested":{"password":"[REDACTED]"}}
    with pytest.raises(HTTPException):validate_metadata({"value":"x"*33000})
    with pytest.raises(HTTPException):validate_metadata({"a":{"b":{"c":{"d":{"e":{"f":{"g":1}}}}}}})


def asset_row(workspace_id=None,**overrides):
    now=datetime.now(UTC);values=dict(id=uuid4(),workspace_id=workspace_id or uuid4(),organization_id=uuid4(),name="Production API",asset_type="domain",canonical_identifier="example.com",normalized_identifier="example.com",environment="production",criticality="high",owner_user_id=None,description=None,source="manual",external_id=None,is_active=True,first_seen_at=now,last_seen_at=now,metadata_json={},version=1,created_by=uuid4(),updated_by=uuid4(),created_at=now,updated_at=now);values.update(overrides);return SimpleNamespace(**values)


class FakeAssetsRepository:
    def __init__(self,row=None):self.row=row;self.audit=[];self.tag_rows=[];self.duplicate_id=None
    async def workspace_organization_id(self,_workspace):return uuid4()
    async def duplicate(self,*_args,**_kwargs):return self.duplicate_id
    async def owner(self,*_args):return None
    async def create(self,**values):self.row=asset_row(**values);return self.row
    async def tags(self,_asset):return self.tag_rows
    async def set_tags(self,_asset,_actor,tags):self.tag_rows=[SimpleNamespace(display_name=display,normalized_name=normalized) for display,normalized in tags];return self.tag_rows
    async def add_audit(self,_asset,_actor,action,**values):self.audit.append((action,values))
    async def related_findings(self,*_args):return []
    async def get_asset(self,workspace_id,asset_id,**_kwargs):return self.row if self.row and self.row.workspace_id==workspace_id and self.row.id==asset_id else None
    def touch(self,row,actor):row.updated_by=actor;row.updated_at=datetime.now(UTC);row.version+=1


def asset_service(row=None):
    service=AssetsService(FakeSession(),principal());service.repository=FakeAssetsRepository(row);return service


def test_asset_create_normalizes_tags_and_audits_without_merging_duplicates():
    workspace_id=uuid4();service=asset_service()
    payload=AssetCreate(name="Public API",asset_type="domain",canonical_identifier="EXAMPLE.COM.",environment="production",criticality="critical",tags=["Internet Facing","internet facing"],metadata_json={"token":"redacted"})
    result=asyncio.run(service.create(workspace_id,payload));assert result["normalized_identifier"]=="example.com";assert result["tags"]==["Internet Facing"];assert result["metadata_json"]["token"]=="[REDACTED]";assert service.repository.audit[0][0]=="asset.created"
    duplicate=asset_service();duplicate.repository.duplicate_id=uuid4()
    with pytest.raises(HTTPException) as exc:asyncio.run(duplicate.create(workspace_id,payload))
    assert exc.value.status_code==409


def test_asset_workspace_isolation_optimistic_conflict_and_activation_audit():
    row=asset_row(version=3);service=asset_service(row)
    with pytest.raises(HTTPException) as missing:asyncio.run(service.detail(uuid4(),row.id))
    assert missing.value.status_code==404
    with pytest.raises(HTTPException) as stale:asyncio.run(service.update(row.workspace_id,row.id,AssetUpdate(version=2,name="Changed")))
    assert stale.value.status_code==409
    result=asyncio.run(service.set_active(row.workspace_id,row.id,3,False));assert not result["is_active"] and result["version"]==4;assert service.repository.audit[-1][0]=="asset.deactivated"


def test_asset_routes_expose_crud_filters_owners_activation_and_findings():
    schema=app.openapi();paths=schema["paths"];base="/api/v1/workspaces/{workspace_id}/assets";detail=f"{base}/{{asset_id}}"
    assert {"get","post"}.issubset(paths[base]);assert {"get","patch"}.issubset(paths[detail]);assert "get" in paths[f"{base}/owners"];assert "post" in paths[f"{detail}/activate"] and "post" in paths[f"{detail}/deactivate"];assert "get" in paths[f"{detail}/findings"]
    parameters={item["name"] for item in paths[base]["get"]["parameters"]};assert {"asset_type","criticality","environment","active","owner_user_id","source","tag","search","page","page_size","sort","direction"}.issubset(parameters)


class FindingRepositoryForAsset:
    def __init__(self,row):self.row=row
    async def get_finding(self,*_args,**_kwargs):return self.row
    async def get_assignee(self,*_args):return None
    async def get_asset(self,*_args):return None


def test_finding_rejects_cross_workspace_asset_assignment():
    row=SimpleNamespace(id=uuid4(),workspace_id=uuid4(),asset_id=None,assignee_user_id=None,version=1)
    service=FindingsService(FakeSession(),principal());service.repository=FindingRepositoryForAsset(row)
    with pytest.raises(HTTPException) as exc:asyncio.run(service.update(row.workspace_id,row.id,FindingUpdate(version=1,asset_id=uuid4())))
    assert exc.value.status_code==422

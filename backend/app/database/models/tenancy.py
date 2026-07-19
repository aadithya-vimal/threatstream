from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


def uuid_column() -> Mapped[UUID]:
    return mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("status IN ('active', 'disabled')", name="status"),)

    id: Mapped[UUID] = uuid_column()
    email: Mapped[str | None] = mapped_column(String(320))
    display_name: Mapped[str | None] = mapped_column(String(160))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="active", server_default="active", nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ExternalIdentity(Base):
    __tablename__ = "external_identities"
    __table_args__ = (UniqueConstraint("provider", "issuer", "subject"),)

    id: Mapped[UUID] = uuid_column()
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    issuer: Mapped[str] = mapped_column(String(500), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    email_at_link_time: Mapped[str | None] = mapped_column(String(320))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Permission(Base):
    __tablename__ = "appsec_permissions"
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)


class WorkspaceRole(Base):
    __tablename__ = "workspace_roles"
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)


class WorkspaceRolePermission(Base):
    __tablename__ = "workspace_role_permissions"
    role_key: Mapped[str] = mapped_column(ForeignKey("workspace_roles.key", ondelete="CASCADE"), primary_key=True)
    permission_key: Mapped[str] = mapped_column(ForeignKey("appsec_permissions.key", ondelete="CASCADE"), primary_key=True)


class Organization(TimestampMixin, Base):
    __tablename__ = "organizations"
    __table_args__ = (
        CheckConstraint("char_length(name) BETWEEN 2 AND 120", name="name_length"),
        CheckConstraint("slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'", name="slug_format"),
    )
    id: Mapped[UUID] = uuid_column()
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = (
        CheckConstraint("role_key IN ('organization_administrator', 'member')", name="role_key"),
        CheckConstraint("status IN ('invited', 'active', 'suspended')", name="status"),
    )
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_key: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", server_default="active", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Workspace(TimestampMixin, Base):
    __tablename__ = "workspaces"
    __table_args__ = (
        UniqueConstraint("organization_id", "slug"),
        CheckConstraint("char_length(name) BETWEEN 2 AND 120", name="name_length"),
        CheckConstraint("slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'", name="slug_format"),
    )
    id: Mapped[UUID] = uuid_column()
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (CheckConstraint("status IN ('invited', 'active', 'suspended')", name="status"),)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_key: Mapped[str] = mapped_column(ForeignKey("workspace_roles.key"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", server_default="active", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Team(TimestampMixin, Base):
    __tablename__ = "teams"
    __table_args__ = (
        UniqueConstraint("workspace_id", "slug"),
        CheckConstraint("char_length(name) BETWEEN 2 AND 120", name="name_length"),
        CheckConstraint("slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'", name="slug_format"),
    )
    id: Mapped[UUID] = uuid_column()
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)


class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (CheckConstraint("role_key IN ('lead', 'member')", name="role_key"),)
    team_id: Mapped[UUID] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_key: Mapped[str] = mapped_column(String(20), default="member", server_default="member", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        CheckConstraint("result IN ('success', 'failure', 'denied')", name="result"),
        Index("ix_audit_events_workspace_created", "workspace_id", "created_at"),
        Index("ix_audit_events_org_created", "organization_id", "created_at"),
    )
    id: Mapped[UUID] = uuid_column()
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False)
    workspace_id: Mapped[UUID | None] = mapped_column(ForeignKey("workspaces.id", ondelete="RESTRICT"))
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(160), nullable=False)
    target_type: Mapped[str] = mapped_column(String(100), nullable=False)
    target_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True))
    request_correlation_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True))
    source_ip: Mapped[str | None] = mapped_column(INET)
    before_summary: Mapped[dict | None] = mapped_column(JSONB)
    after_summary: Mapped[dict | None] = mapped_column(JSONB)
    result: Mapped[str] = mapped_column(String(20), default="success", server_default="success", nullable=False)
    event_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class IntegrationCredential(Base):
    __tablename__ = "integration_credentials"
    __table_args__ = (
        UniqueConstraint("workspace_id", "provider_key"),
        CheckConstraint("provider_key ~ '^[a-z0-9]+(?:[_-][a-z0-9]+)*$'", name="provider_key_format"),
        CheckConstraint("char_length(secret_hint) <= 32", name="secret_hint_length"),
        CheckConstraint("key_version > 0", name="key_version"),
        CheckConstraint("status IN ('untested', 'connected', 'invalid_credentials', 'unreachable', 'rate_limited', 'provider_error', 'configuration_error')", name="status"),
    )
    id: Mapped[UUID] = uuid_column()
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_key: Mapped[str] = mapped_column(String(80), nullable=False)
    secret_ciphertext: Mapped[str] = mapped_column(Text, nullable=False)
    secret_nonce: Mapped[str] = mapped_column(Text, nullable=False)
    secret_hint: Mapped[str] = mapped_column(String(32), nullable=False)
    key_version: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="untested", server_default="untested", nullable=False)
    last_tested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_successful_test_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_failure_category: Mapped[str | None] = mapped_column(String(32))
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    updated_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    rotated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = (
        UniqueConstraint("workspace_id", "asset_type", "normalized_identifier"),
        CheckConstraint("asset_type IN ('domain', 'subdomain', 'ip_address', 'url', 'repository', 'cloud_account', 'host', 'container_image', 'kubernetes_cluster', 'custom')", name="asset_type"),
        CheckConstraint("criticality IN ('critical', 'high', 'medium', 'low', 'unclassified')", name="criticality"),
        CheckConstraint("environment IN ('production', 'staging', 'development', 'testing', 'internal', 'external', 'unknown')", name="environment"),
        CheckConstraint("version > 0", name="version"),
        Index("ix_assets_workspace_updated", "workspace_id", "updated_at"),
        Index("ix_assets_workspace_type_active", "workspace_id", "asset_type", "is_active"),
    )
    id: Mapped[UUID] = uuid_column()
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(32), nullable=False)
    canonical_identifier: Mapped[str] = mapped_column(String(1000), nullable=False)
    normalized_identifier: Mapped[str] = mapped_column(String(1000), nullable=False)
    environment: Mapped[str] = mapped_column(String(24), nullable=False, default="unknown", server_default="unknown")
    criticality: Mapped[str] = mapped_column(String(20), nullable=False, default="unclassified", server_default="unclassified")
    owner_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(120), nullable=False, default="manual", server_default="manual")
    external_id: Mapped[str | None] = mapped_column(String(240))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    updated_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class AssetTag(Base):
    __tablename__ = "asset_tags"
    __table_args__ = (UniqueConstraint("workspace_id", "normalized_name"),)
    id: Mapped[UUID] = uuid_column()
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(80), nullable=False)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class AssetTagLink(Base):
    __tablename__ = "asset_tag_links"
    asset_id: Mapped[UUID] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[UUID] = mapped_column(ForeignKey("asset_tags.id", ondelete="CASCADE"), primary_key=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ScanProfile(Base):
    __tablename__ = "scan_profiles"
    __table_args__ = (UniqueConstraint("workspace_id", "name"), CheckConstraint("scanner_type IN ('nuclei')", name="scanner_type"), CheckConstraint("version > 0", name="version"), Index("ix_scan_profiles_workspace_scanner", "workspace_id", "scanner_type"))
    id: Mapped[UUID] = uuid_column(); workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True); organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False); description: Mapped[str | None] = mapped_column(Text); scanner_type: Mapped[str] = mapped_column(String(32), nullable=False); configuration_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}"); is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true"); version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False); updated_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False); created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now()); updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class ScanProfileTarget(Base):
    __tablename__ = "scan_profile_targets"
    profile_id: Mapped[UUID] = mapped_column(ForeignKey("scan_profiles.id", ondelete="CASCADE"), primary_key=True); asset_id: Mapped[UUID] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True); workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True); created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False); created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ScanSchedule(Base):
    __tablename__ = "scan_schedules"
    __table_args__ = (UniqueConstraint("workspace_id", "name"), CheckConstraint("schedule_type IN ('interval','cron')", name="schedule_type"), CheckConstraint("misfire_policy IN ('skip','run_once')", name="misfire_policy"), CheckConstraint("version > 0", name="version"), Index("ix_scan_schedules_workspace_due", "workspace_id", "is_enabled", "next_run_at"))
    id: Mapped[UUID] = uuid_column(); workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True); organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False); profile_id: Mapped[UUID] = mapped_column(ForeignKey("scan_profiles.id", ondelete="RESTRICT"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False); schedule_type: Mapped[str] = mapped_column(String(20), nullable=False); cron_expression: Mapped[str | None] = mapped_column(String(160)); interval_minutes: Mapped[int | None] = mapped_column(Integer); timezone: Mapped[str] = mapped_column(String(80), nullable=False, default="UTC", server_default="UTC"); is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true"); next_run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False); last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); last_job_id: Mapped[UUID | None] = mapped_column(ForeignKey("scan_jobs.id", ondelete="SET NULL", use_alter=True)); last_outcome: Mapped[str | None] = mapped_column(String(40)); misfire_policy: Mapped[str] = mapped_column(String(20), nullable=False, default="run_once", server_default="run_once"); max_catch_up_runs: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1"); version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1"); created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False); updated_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False); created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now()); updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class ScanJob(Base):
    __tablename__ = "scan_jobs"
    __table_args__ = (CheckConstraint("status IN ('queued','claimed','running','processing','completed','failed','cancelled')", name="status"), CheckConstraint("scanner_type IN ('nuclei')", name="scanner_type"), CheckConstraint("version > 0", name="version"), CheckConstraint("attempt_count >= 0 AND max_attempts BETWEEN 1 AND 10", name="attempts"), CheckConstraint("origin IN ('manual','schedule')", name="origin"), UniqueConstraint("schedule_id", "scheduled_for"), Index("ix_scan_jobs_workspace_status_created", "workspace_id", "status", "created_at"), Index("ix_scan_jobs_profile_created", "profile_id", "created_at"), Index("ix_scan_jobs_scanner_type", "scanner_type"), Index("ix_scan_jobs_claimable", "status", "available_at", "next_retry_at", "lease_expires_at"), Index("ix_scan_jobs_lease_expiry", "status", "lease_expires_at"), Index("uq_scan_jobs_active_profile", "profile_id", unique=True, postgresql_where=text("status IN ('queued','claimed','running','processing')")))
    id: Mapped[UUID] = uuid_column(); workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True); organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False); profile_id: Mapped[UUID] = mapped_column(ForeignKey("scan_profiles.id", ondelete="RESTRICT"), nullable=False, index=True); scanner_type: Mapped[str] = mapped_column(String(32), nullable=False); status: Mapped[str] = mapped_column(String(24), nullable=False, default="queued", server_default="queued")
    requested_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False); claimed_by: Mapped[str | None] = mapped_column(String(160)); started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); failure_code: Mapped[str | None] = mapped_column(String(80)); failure_message: Mapped[str | None] = mapped_column(String(500))
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now()); claim_token: Mapped[str | None] = mapped_column(String(128)); claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0"); max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3, server_default="3"); next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); last_failure_code: Mapped[str | None] = mapped_column(String(80)); last_failure_summary: Mapped[str | None] = mapped_column(String(500)); cancellation_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); worker_id: Mapped[str | None] = mapped_column(String(160)); origin: Mapped[str] = mapped_column(String(20), nullable=False, default="manual", server_default="manual"); schedule_id: Mapped[UUID | None] = mapped_column(ForeignKey("scan_schedules.id", ondelete="SET NULL"), index=True); scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    target_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0"); processed_target_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0"); findings_created_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0"); findings_updated_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0"); findings_reopened_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0"); findings_unchanged_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0"); raw_result_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0"); version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1"); created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now()); updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class ScanJobTarget(Base):
    __tablename__ = "scan_job_targets"
    __table_args__ = (UniqueConstraint("job_id", "asset_id"), CheckConstraint("execution_status IN ('pending','running','completed','failed','cancelled')", name="execution_status"), Index("ix_scan_job_targets_job_status", "job_id", "execution_status"))
    id: Mapped[UUID] = uuid_column(); job_id: Mapped[UUID] = mapped_column(ForeignKey("scan_jobs.id", ondelete="CASCADE"), nullable=False, index=True); asset_id: Mapped[UUID] = mapped_column(ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False, index=True); workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False); normalized_target: Mapped[str] = mapped_column(String(1000), nullable=False); asset_type: Mapped[str] = mapped_column(String(32), nullable=False); execution_status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending", server_default="pending"); started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); error_summary: Mapped[str | None] = mapped_column(String(500)); result_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")


class RawScanResult(Base):
    __tablename__ = "raw_scan_results"
    __table_args__ = (UniqueConstraint("job_target_id", "payload_hash"), CheckConstraint("processing_status IN ('pending','processed','failed')", name="processing_status"), Index("ix_raw_scan_results_job_processing", "job_id", "processing_status"))
    id: Mapped[UUID] = uuid_column(); job_id: Mapped[UUID] = mapped_column(ForeignKey("scan_jobs.id", ondelete="CASCADE"), nullable=False, index=True); job_target_id: Mapped[UUID] = mapped_column(ForeignKey("scan_job_targets.id", ondelete="CASCADE"), nullable=False, index=True); scanner_type: Mapped[str] = mapped_column(String(32), nullable=False); adapter_version: Mapped[str] = mapped_column(String(40), nullable=False); parser_version: Mapped[str] = mapped_column(String(40), nullable=False); payload_json: Mapped[dict] = mapped_column(JSONB, nullable=False); payload_hash: Mapped[str] = mapped_column(String(64), nullable=False); received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now()); processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True)); processing_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", server_default="pending"); processing_error: Mapped[str | None] = mapped_column(String(500))


class Finding(Base):
    __tablename__ = "findings"
    __table_args__ = (
        CheckConstraint("status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed', 'reopened')", name="status"),
        CheckConstraint("severity IN ('critical', 'high', 'medium', 'low', 'informational')", name="severity"),
        CheckConstraint("version > 0", name="version"),
        Index("ix_findings_workspace_updated", "workspace_id", "updated_at"),
        Index("ix_findings_workspace_status_severity", "workspace_id", "status", "severity"),
        Index("uq_findings_workspace_source_external_manual", "workspace_id", "source", "external_id", unique=True, postgresql_where=text("scanner_fingerprint IS NULL AND external_id IS NOT NULL")),
        Index("uq_findings_workspace_scanner_fingerprint", "workspace_id", "scanner_fingerprint", unique=True, postgresql_where=text("scanner_fingerprint IS NOT NULL")),
    )
    id: Mapped[UUID] = uuid_column()
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="open", server_default="open", nullable=False)
    source: Mapped[str] = mapped_column(String(120), default="manual", server_default="manual", nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(240))
    remediation: Mapped[str | None] = mapped_column(Text)
    resolution_summary: Mapped[str | None] = mapped_column(Text)
    assignee_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    asset_id: Mapped[UUID | None] = mapped_column(ForeignKey("assets.id", ondelete="SET NULL"), index=True)
    scanner_fingerprint: Mapped[str | None] = mapped_column(String(64))
    scanner_type: Mapped[str | None] = mapped_column(String(32))
    first_detected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_detected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    occurrence_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    scanner_metadata: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    updated_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reopened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class FindingEvidence(Base):
    __tablename__ = "finding_evidence"
    __table_args__ = (CheckConstraint("kind IN ('text', 'url', 'code')", name="kind"),)
    id: Mapped[UUID] = uuid_column()
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_id: Mapped[UUID] = mapped_column(ForeignKey("findings.id", ondelete="CASCADE"), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FindingComment(Base):
    __tablename__ = "finding_comments"
    id: Mapped[UUID] = uuid_column()
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_id: Mapped[UUID] = mapped_column(ForeignKey("findings.id", ondelete="CASCADE"), nullable=False, index=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FindingActivity(Base):
    __tablename__ = "finding_activities"
    __table_args__ = (Index("ix_finding_activities_finding_created", "finding_id", "created_at"),)
    id: Mapped[UUID] = uuid_column()
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_id: Mapped[UUID] = mapped_column(ForeignKey("findings.id", ondelete="CASCADE"), nullable=False)
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(24))
    to_status: Mapped[str | None] = mapped_column(String(24))
    changes: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FindingOccurrence(Base):
    __tablename__ = "finding_occurrences"
    __table_args__ = (UniqueConstraint("raw_result_id"), Index("ix_finding_occurrences_finding_detected", "finding_id", "detected_at"),)
    id: Mapped[UUID] = uuid_column(); finding_id: Mapped[UUID] = mapped_column(ForeignKey("findings.id", ondelete="CASCADE"), nullable=False, index=True); job_id: Mapped[UUID] = mapped_column(ForeignKey("scan_jobs.id", ondelete="RESTRICT"), nullable=False, index=True); job_target_id: Mapped[UUID] = mapped_column(ForeignKey("scan_job_targets.id", ondelete="RESTRICT"), nullable=False); raw_result_id: Mapped[UUID] = mapped_column(ForeignKey("raw_scan_results.id", ondelete="RESTRICT"), nullable=False); scanner_type: Mapped[str] = mapped_column(String(32), nullable=False); detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now()); severity: Mapped[str] = mapped_column(String(20), nullable=False); matched_location: Mapped[str | None] = mapped_column(String(1000)); evidence_summary: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}"); metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")

"""Canonical Phase 2 PostgreSQL tenancy schema."""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260718_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PERMISSIONS = {
    "organization:manage": "Manage organization settings and membership",
    "workspace:read": "Read workspace data", "workspace:manage": "Manage workspace settings and membership",
    "team:manage": "Manage teams and team membership", "application:read": "Read applications and components",
    "application:create": "Create applications", "application:update": "Update applications", "application:delete": "Delete applications",
    "repository:connect": "Connect and map repositories", "integration:manage": "Manage provider integrations",
    "scan:create": "Create scan runs", "scan:cancel": "Cancel scan runs", "scan:read": "Read scan runs and artifacts",
    "finding:read": "Read findings", "finding:triage": "Triage and assign findings", "finding:suppress": "Suppress findings",
    "finding:accept_risk": "Accept finding risk", "remediation:create": "Create remediation work",
    "remediation:assign": "Assign remediation work", "remediation:update": "Update remediation work",
    "deployment:manage": "Manage environments and deployments", "runtime_event:ingest": "Ingest runtime events",
    "runtime_event:read": "Read runtime events", "case:create": "Create security cases", "case:update": "Update security cases",
    "audit:read": "Read audit events", "policy:manage": "Manage security and scan policies",
}

ROLES = {
    "workspace_administrator": ("Workspace Administrator", "Full workspace administration"),
    "application_security_engineer": ("Application Security Engineer", "Application security triage and policy management"),
    "devsecops_engineer": ("DevSecOps Engineer", "Repository, scan, deployment, and remediation operations"),
    "secops_analyst": ("SecOps Analyst", "Runtime event, alert, and case operations"),
    "developer": ("Developer", "Application visibility and assigned remediation work"),
    "read_only": ("Read Only", "Read-only workspace access"),
}

ROLE_GRANTS = {
    "application_security_engineer": set(PERMISSIONS) - {"organization:manage", "application:delete", "runtime_event:ingest"},
    "devsecops_engineer": {"workspace:read", "application:read", "application:create", "application:update", "repository:connect", "scan:create", "scan:cancel", "scan:read", "finding:read", "finding:triage", "remediation:create", "remediation:update", "deployment:manage", "runtime_event:read"},
    "secops_analyst": {"workspace:read", "application:read", "scan:read", "finding:read", "finding:triage", "remediation:create", "remediation:assign", "remediation:update", "runtime_event:read", "case:create", "case:update"},
    "developer": {"workspace:read", "application:read", "scan:read", "finding:read", "remediation:create", "remediation:update", "deployment:manage"},
    "read_only": {"workspace:read", "application:read", "scan:read", "finding:read", "runtime_event:read"},
}


def upgrade() -> None:
    uuid = postgresql.UUID(as_uuid=True)
    timestamp = sa.DateTime(timezone=True)
    op.create_table("users", sa.Column("id", uuid, primary_key=True), sa.Column("email", sa.String(320)), sa.Column("display_name", sa.String(160)), sa.Column("avatar_url", sa.Text()), sa.Column("status", sa.String(20), nullable=False, server_default="active"), sa.Column("last_seen_at", timestamp), sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()), sa.Column("updated_at", timestamp, nullable=False, server_default=sa.func.now()), sa.CheckConstraint("status IN ('active', 'disabled')", name="ck_users_status"))
    op.create_table("external_identities", sa.Column("id", uuid, primary_key=True), sa.Column("user_id", uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("provider", sa.String(40), nullable=False), sa.Column("issuer", sa.String(500), nullable=False), sa.Column("subject", sa.String(255), nullable=False), sa.Column("email_at_link_time", sa.String(320)), sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()), sa.Column("last_seen_at", timestamp, nullable=False, server_default=sa.func.now()), sa.UniqueConstraint("provider", "issuer", "subject", name="uq_external_identities_provider_issuer_subject"))
    op.create_index("ix_external_identities_user_id", "external_identities", ["user_id"])
    op.create_table("appsec_permissions", sa.Column("key", sa.String(100), primary_key=True), sa.Column("description", sa.Text(), nullable=False))
    op.create_table("workspace_roles", sa.Column("key", sa.String(100), primary_key=True), sa.Column("name", sa.String(120), nullable=False), sa.Column("description", sa.Text(), nullable=False), sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_table("workspace_role_permissions", sa.Column("role_key", sa.String(100), sa.ForeignKey("workspace_roles.key", ondelete="CASCADE"), primary_key=True), sa.Column("permission_key", sa.String(100), sa.ForeignKey("appsec_permissions.key", ondelete="CASCADE"), primary_key=True))
    op.create_table("organizations", sa.Column("id", uuid, primary_key=True), sa.Column("name", sa.String(120), nullable=False), sa.Column("slug", sa.String(80), nullable=False, unique=True), sa.Column("created_by", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()), sa.Column("updated_at", timestamp, nullable=False, server_default=sa.func.now()), sa.CheckConstraint("char_length(name) BETWEEN 2 AND 120", name="ck_organizations_name_length"), sa.CheckConstraint("slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'", name="ck_organizations_slug_format"))
    op.create_table("organization_members", sa.Column("organization_id", uuid, sa.ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True), sa.Column("user_id", uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True), sa.Column("role_key", sa.String(100), nullable=False), sa.Column("status", sa.String(20), nullable=False, server_default="active"), sa.Column("joined_at", timestamp, nullable=False, server_default=sa.func.now()), sa.CheckConstraint("role_key IN ('organization_administrator', 'member')", name="ck_organization_members_role_key"), sa.CheckConstraint("status IN ('invited', 'active', 'suspended')", name="ck_organization_members_status"))
    op.create_index("ix_organization_members_user_status", "organization_members", ["user_id", "status"])
    op.create_table("workspaces", sa.Column("id", uuid, primary_key=True), sa.Column("organization_id", uuid, sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False), sa.Column("name", sa.String(120), nullable=False), sa.Column("slug", sa.String(80), nullable=False), sa.Column("description", sa.Text()), sa.Column("created_by", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()), sa.Column("updated_at", timestamp, nullable=False, server_default=sa.func.now()), sa.UniqueConstraint("organization_id", "slug", name="uq_workspaces_organization_id_slug"), sa.CheckConstraint("char_length(name) BETWEEN 2 AND 120", name="ck_workspaces_name_length"), sa.CheckConstraint("slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'", name="ck_workspaces_slug_format"))
    op.create_index("ix_workspaces_organization_id", "workspaces", ["organization_id"])
    op.create_table("workspace_members", sa.Column("workspace_id", uuid, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True), sa.Column("user_id", uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True), sa.Column("role_key", sa.String(100), sa.ForeignKey("workspace_roles.key"), nullable=False), sa.Column("status", sa.String(20), nullable=False, server_default="active"), sa.Column("joined_at", timestamp, nullable=False, server_default=sa.func.now()), sa.CheckConstraint("status IN ('invited', 'active', 'suspended')", name="ck_workspace_members_status"))
    op.create_index("ix_workspace_members_user_status", "workspace_members", ["user_id", "status"])
    op.create_table("teams", sa.Column("id", uuid, primary_key=True), sa.Column("organization_id", uuid, sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False), sa.Column("workspace_id", uuid, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False), sa.Column("name", sa.String(120), nullable=False), sa.Column("slug", sa.String(80), nullable=False), sa.Column("description", sa.Text()), sa.Column("created_by", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()), sa.Column("updated_at", timestamp, nullable=False, server_default=sa.func.now()), sa.UniqueConstraint("workspace_id", "slug", name="uq_teams_workspace_id_slug"), sa.CheckConstraint("char_length(name) BETWEEN 2 AND 120", name="ck_teams_name_length"), sa.CheckConstraint("slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'", name="ck_teams_slug_format"))
    op.create_index("ix_teams_workspace_id", "teams", ["workspace_id"])
    op.create_table("team_members", sa.Column("team_id", uuid, sa.ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True), sa.Column("user_id", uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True), sa.Column("role_key", sa.String(20), nullable=False, server_default="member"), sa.Column("joined_at", timestamp, nullable=False, server_default=sa.func.now()), sa.CheckConstraint("role_key IN ('lead', 'member')", name="ck_team_members_role_key"))
    op.create_index("ix_team_members_user_id", "team_members", ["user_id"])
    op.create_table("audit_events", sa.Column("id", uuid, primary_key=True), sa.Column("organization_id", uuid, sa.ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False), sa.Column("workspace_id", uuid, sa.ForeignKey("workspaces.id", ondelete="RESTRICT")), sa.Column("actor_id", uuid, sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("action", sa.String(160), nullable=False), sa.Column("target_type", sa.String(100), nullable=False), sa.Column("target_id", uuid), sa.Column("request_correlation_id", uuid), sa.Column("source_ip", postgresql.INET()), sa.Column("before_summary", postgresql.JSONB()), sa.Column("after_summary", postgresql.JSONB()), sa.Column("result", sa.String(20), nullable=False, server_default="success"), sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")), sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()), sa.CheckConstraint("result IN ('success', 'failure', 'denied')", name="ck_audit_events_result"))
    op.create_index("ix_audit_events_workspace_created", "audit_events", ["workspace_id", sa.text("created_at DESC")])
    op.create_index("ix_audit_events_org_created", "audit_events", ["organization_id", sa.text("created_at DESC")])
    op.create_table("integration_credentials", sa.Column("id", uuid, primary_key=True), sa.Column("organization_id", uuid, sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False), sa.Column("workspace_id", uuid, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False), sa.Column("provider_key", sa.String(80), nullable=False), sa.Column("secret_ciphertext", sa.Text(), nullable=False), sa.Column("secret_nonce", sa.Text(), nullable=False), sa.Column("secret_hint", sa.String(32), nullable=False), sa.Column("key_version", sa.Integer(), nullable=False, server_default="1"), sa.Column("created_by", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()), sa.Column("rotated_at", timestamp, nullable=False, server_default=sa.func.now()), sa.UniqueConstraint("workspace_id", "provider_key", name="uq_integration_credentials_workspace_id_provider_key"), sa.CheckConstraint("provider_key ~ '^[a-z0-9]+(?:[_-][a-z0-9]+)*$'", name="ck_integration_credentials_provider_key_format"), sa.CheckConstraint("char_length(secret_hint) <= 32", name="ck_integration_credentials_secret_hint_length"), sa.CheckConstraint("key_version > 0", name="ck_integration_credentials_key_version"))
    op.create_index("ix_integration_credentials_workspace_id", "integration_credentials", ["workspace_id"])

    permission_table = sa.table("appsec_permissions", sa.column("key", sa.String()), sa.column("description", sa.Text()))
    role_table = sa.table("workspace_roles", sa.column("key", sa.String()), sa.column("name", sa.String()), sa.column("description", sa.Text()), sa.column("is_system", sa.Boolean()))
    grant_table = sa.table("workspace_role_permissions", sa.column("role_key", sa.String()), sa.column("permission_key", sa.String()))
    op.bulk_insert(permission_table, [{"key": key, "description": value} for key, value in PERMISSIONS.items()])
    op.bulk_insert(role_table, [{"key": key, "name": value[0], "description": value[1], "is_system": True} for key, value in ROLES.items()])
    grants = [{"role_key": "workspace_administrator", "permission_key": key} for key in PERMISSIONS]
    grants += [{"role_key": role, "permission_key": permission} for role, permissions in ROLE_GRANTS.items() for permission in sorted(permissions)]
    op.bulk_insert(grant_table, grants)
    op.execute("CREATE FUNCTION prevent_audit_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit events are append-only'; END; $$")
    op.execute("CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation()")


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS audit_events_immutable ON audit_events")
    op.execute("DROP FUNCTION IF EXISTS prevent_audit_event_mutation()")
    for table in ["integration_credentials", "audit_events", "team_members", "teams", "workspace_members", "workspaces", "organization_members", "organizations", "workspace_role_permissions", "workspace_roles", "appsec_permissions", "external_identities", "users"]:
        op.drop_table(table)

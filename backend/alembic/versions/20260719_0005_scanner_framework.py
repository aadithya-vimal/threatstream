"""add scanner execution and ingestion framework

Revision ID: 20260719_0005
Revises: 20260719_0004
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260719_0005"
down_revision = "20260719_0004"
branch_labels = None
depends_on = None

PERMISSIONS = {
    "scan:run": "Queue workspace scan jobs",
    "scan:manage": "Manage scan profiles, targets, and cancellation",
}
ROLE_GRANTS = {
    "workspace_administrator": set(PERMISSIONS),
    "application_security_engineer": set(PERMISSIONS),
    "devsecops_engineer": set(PERMISSIONS),
    "secops_analyst": {"scan:run"},
}


def upgrade() -> None:
    uuid = postgresql.UUID(as_uuid=True)
    timestamp = sa.DateTime(timezone=True)
    permission = sa.table("appsec_permissions", sa.column("key", sa.String()), sa.column("description", sa.Text()))
    grants = sa.table("workspace_role_permissions", sa.column("role_key", sa.String()), sa.column("permission_key", sa.String()))
    op.bulk_insert(permission, [{"key": key, "description": value} for key, value in PERMISSIONS.items()])
    op.bulk_insert(grants, [{"role_key": role, "permission_key": key} for role, keys in ROLE_GRANTS.items() for key in sorted(keys)])

    op.create_table(
        "scan_profiles",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("workspace_id", uuid, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", uuid, sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("scanner_type", sa.String(32), nullable=False),
        sa.Column("configuration_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("updated_by", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", timestamp, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("workspace_id", "name"),
        sa.CheckConstraint("scanner_type IN ('nuclei')", name="ck_scan_profiles_scanner_type"),
        sa.CheckConstraint("version > 0", name="ck_scan_profiles_version"),
    )
    op.create_index("ix_scan_profiles_workspace_id", "scan_profiles", ["workspace_id"])
    op.create_index("ix_scan_profiles_workspace_scanner", "scan_profiles", ["workspace_id", "scanner_type"])
    op.create_table(
        "scan_profile_targets",
        sa.Column("profile_id", uuid, sa.ForeignKey("scan_profiles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("asset_id", uuid, sa.ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("workspace_id", uuid, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_scan_profile_targets_workspace_id", "scan_profile_targets", ["workspace_id"])

    op.create_table(
        "scan_jobs",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("workspace_id", uuid, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", uuid, sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("profile_id", uuid, sa.ForeignKey("scan_profiles.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("scanner_type", sa.String(32), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="queued"),
        sa.Column("requested_by", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("claimed_by", sa.String(160)),
        sa.Column("started_at", timestamp), sa.Column("completed_at", timestamp), sa.Column("cancelled_at", timestamp),
        sa.Column("failure_code", sa.String(80)), sa.Column("failure_message", sa.String(500)),
        *[sa.Column(name, sa.Integer(), nullable=False, server_default="0") for name in (
            "target_count", "processed_target_count", "findings_created_count", "findings_updated_count",
            "findings_reopened_count", "findings_unchanged_count", "raw_result_count")],
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", timestamp, nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('queued','claimed','running','processing','completed','failed','cancelled')", name="ck_scan_jobs_status"),
        sa.CheckConstraint("scanner_type IN ('nuclei')", name="ck_scan_jobs_scanner_type"),
        sa.CheckConstraint("version > 0", name="ck_scan_jobs_version"),
    )
    op.create_index("ix_scan_jobs_workspace_id", "scan_jobs", ["workspace_id"])
    op.create_index("ix_scan_jobs_profile_id", "scan_jobs", ["profile_id"])
    op.create_index("ix_scan_jobs_workspace_status_created", "scan_jobs", ["workspace_id", "status", "created_at"])
    op.create_index("ix_scan_jobs_profile_created", "scan_jobs", ["profile_id", "created_at"])
    op.create_index("ix_scan_jobs_scanner_type", "scan_jobs", ["scanner_type"])
    op.create_index("uq_scan_jobs_active_profile", "scan_jobs", ["profile_id"], unique=True,
        postgresql_where=sa.text("status IN ('queued','claimed','running','processing')"))

    op.create_table(
        "scan_job_targets",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("job_id", uuid, sa.ForeignKey("scan_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_id", uuid, sa.ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("workspace_id", uuid, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("normalized_target", sa.String(1000), nullable=False),
        sa.Column("asset_type", sa.String(32), nullable=False),
        sa.Column("execution_status", sa.String(24), nullable=False, server_default="pending"),
        sa.Column("started_at", timestamp), sa.Column("completed_at", timestamp),
        sa.Column("error_summary", sa.String(500)),
        sa.Column("result_count", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("job_id", "asset_id"),
        sa.CheckConstraint("execution_status IN ('pending','running','completed','failed','cancelled')", name="ck_scan_job_targets_execution_status"),
    )
    op.create_index("ix_scan_job_targets_job_id", "scan_job_targets", ["job_id"])
    op.create_index("ix_scan_job_targets_asset_id", "scan_job_targets", ["asset_id"])
    op.create_index("ix_scan_job_targets_job_status", "scan_job_targets", ["job_id", "execution_status"])

    op.create_table(
        "raw_scan_results",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("job_id", uuid, sa.ForeignKey("scan_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_target_id", uuid, sa.ForeignKey("scan_job_targets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scanner_type", sa.String(32), nullable=False),
        sa.Column("adapter_version", sa.String(40), nullable=False), sa.Column("parser_version", sa.String(40), nullable=False),
        sa.Column("payload_json", postgresql.JSONB(), nullable=False), sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("received_at", timestamp, nullable=False, server_default=sa.func.now()), sa.Column("processed_at", timestamp),
        sa.Column("processing_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("processing_error", sa.String(500)),
        sa.UniqueConstraint("job_target_id", "payload_hash"),
        sa.CheckConstraint("processing_status IN ('pending','processed','failed')", name="ck_raw_scan_results_processing_status"),
    )
    op.create_index("ix_raw_scan_results_job_id", "raw_scan_results", ["job_id"])
    op.create_index("ix_raw_scan_results_job_target_id", "raw_scan_results", ["job_target_id"])
    op.create_index("ix_raw_scan_results_job_processing", "raw_scan_results", ["job_id", "processing_status"])

    op.drop_constraint("uq_findings_workspace_id", "findings", type_="unique")
    op.add_column("findings", sa.Column("scanner_fingerprint", sa.String(64)))
    op.add_column("findings", sa.Column("scanner_type", sa.String(32)))
    op.add_column("findings", sa.Column("first_detected_at", timestamp))
    op.add_column("findings", sa.Column("last_detected_at", timestamp))
    op.add_column("findings", sa.Column("occurrence_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("findings", sa.Column("scanner_metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")))
    op.create_index("uq_findings_workspace_scanner_fingerprint", "findings", ["workspace_id", "scanner_fingerprint"], unique=True,
        postgresql_where=sa.text("scanner_fingerprint IS NOT NULL"))
    op.create_index("uq_findings_workspace_source_external_manual", "findings", ["workspace_id", "source", "external_id"], unique=True,
        postgresql_where=sa.text("scanner_fingerprint IS NULL AND external_id IS NOT NULL"))

    op.create_table(
        "finding_occurrences",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("finding_id", uuid, sa.ForeignKey("findings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", uuid, sa.ForeignKey("scan_jobs.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("job_target_id", uuid, sa.ForeignKey("scan_job_targets.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("raw_result_id", uuid, sa.ForeignKey("raw_scan_results.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("scanner_type", sa.String(32), nullable=False),
        sa.Column("detected_at", timestamp, nullable=False, server_default=sa.func.now()),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("matched_location", sa.String(1000)),
        sa.Column("evidence_summary", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index("ix_finding_occurrences_finding_id", "finding_occurrences", ["finding_id"])
    op.create_index("ix_finding_occurrences_job_id", "finding_occurrences", ["job_id"])
    op.create_index("ix_finding_occurrences_finding_detected", "finding_occurrences", ["finding_id", "detected_at"])


def downgrade() -> None:
    op.drop_table("finding_occurrences")
    op.drop_index("uq_findings_workspace_source_external_manual", table_name="findings")
    op.drop_index("uq_findings_workspace_scanner_fingerprint", table_name="findings")
    for column in ("scanner_metadata", "occurrence_count", "last_detected_at", "first_detected_at", "scanner_type", "scanner_fingerprint"):
        op.drop_column("findings", column)
    op.create_unique_constraint("uq_findings_workspace_id", "findings", ["workspace_id", "source", "external_id"])
    op.drop_table("raw_scan_results")
    op.drop_table("scan_job_targets")
    op.drop_table("scan_jobs")
    op.drop_table("scan_profile_targets")
    op.drop_table("scan_profiles")
    op.execute(sa.text("DELETE FROM workspace_role_permissions WHERE permission_key IN ('scan:run','scan:manage')"))
    op.execute(sa.text("DELETE FROM appsec_permissions WHERE key IN ('scan:run','scan:manage')"))

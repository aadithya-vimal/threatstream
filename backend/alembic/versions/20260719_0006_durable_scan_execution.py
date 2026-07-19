"""add durable scan execution leases and schedules

Revision ID: 20260719_0006
Revises: 20260719_0005
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision="20260719_0006"
down_revision="20260719_0005"
branch_labels=None
depends_on=None


def upgrade():
    uuid=postgresql.UUID(as_uuid=True);timestamp=sa.DateTime(timezone=True)
    op.create_table("scan_schedules",
        sa.Column("id",uuid,primary_key=True),sa.Column("workspace_id",uuid,sa.ForeignKey("workspaces.id",ondelete="CASCADE"),nullable=False),sa.Column("organization_id",uuid,sa.ForeignKey("organizations.id",ondelete="CASCADE"),nullable=False),sa.Column("profile_id",uuid,sa.ForeignKey("scan_profiles.id",ondelete="RESTRICT"),nullable=False),
        sa.Column("name",sa.String(160),nullable=False),sa.Column("schedule_type",sa.String(20),nullable=False),sa.Column("cron_expression",sa.String(160)),sa.Column("interval_minutes",sa.Integer()),sa.Column("timezone",sa.String(80),nullable=False,server_default="UTC"),sa.Column("is_enabled",sa.Boolean(),nullable=False,server_default=sa.true()),sa.Column("next_run_at",timestamp,nullable=False),sa.Column("last_run_at",timestamp),sa.Column("last_job_id",uuid),sa.Column("last_outcome",sa.String(40)),sa.Column("misfire_policy",sa.String(20),nullable=False,server_default="run_once"),sa.Column("max_catch_up_runs",sa.Integer(),nullable=False,server_default="1"),sa.Column("version",sa.Integer(),nullable=False,server_default="1"),sa.Column("created_by",uuid,sa.ForeignKey("users.id",ondelete="RESTRICT"),nullable=False),sa.Column("updated_by",uuid,sa.ForeignKey("users.id",ondelete="RESTRICT"),nullable=False),sa.Column("created_at",timestamp,nullable=False,server_default=sa.func.now()),sa.Column("updated_at",timestamp,nullable=False,server_default=sa.func.now()),
        sa.UniqueConstraint("workspace_id","name",name="uq_scan_schedules_workspace_name"),sa.CheckConstraint("schedule_type IN ('interval','cron')",name="ck_scan_schedules_schedule_type"),sa.CheckConstraint("misfire_policy IN ('skip','run_once')",name="ck_scan_schedules_misfire_policy"),sa.CheckConstraint("version > 0",name="ck_scan_schedules_version"),sa.CheckConstraint("max_catch_up_runs BETWEEN 0 AND 1",name="ck_scan_schedules_catch_up"),sa.CheckConstraint("(schedule_type='interval' AND interval_minutes BETWEEN 15 AND 525600 AND cron_expression IS NULL) OR (schedule_type='cron' AND cron_expression IS NOT NULL AND interval_minutes IS NULL)",name="ck_scan_schedules_shape"))
    op.create_index("ix_scan_schedules_workspace_id","scan_schedules",["workspace_id"]);op.create_index("ix_scan_schedules_profile_id","scan_schedules",["profile_id"]);op.create_index("ix_scan_schedules_workspace_due","scan_schedules",["workspace_id","is_enabled","next_run_at"])

    columns=(
        sa.Column("available_at",timestamp,nullable=False,server_default=sa.func.now()),sa.Column("claim_token",sa.String(128)),sa.Column("claimed_at",timestamp),sa.Column("lease_expires_at",timestamp),sa.Column("heartbeat_at",timestamp),sa.Column("attempt_count",sa.Integer(),nullable=False,server_default="0"),sa.Column("max_attempts",sa.Integer(),nullable=False,server_default="3"),sa.Column("next_retry_at",timestamp),sa.Column("last_failure_code",sa.String(80)),sa.Column("last_failure_summary",sa.String(500)),sa.Column("cancellation_requested_at",timestamp),sa.Column("worker_id",sa.String(160)),sa.Column("origin",sa.String(20),nullable=False,server_default="manual"),sa.Column("schedule_id",uuid),sa.Column("scheduled_for",timestamp),
    )
    for column in columns:op.add_column("scan_jobs",column)
    op.create_foreign_key("fk_scan_jobs_schedule_id_scan_schedules","scan_jobs","scan_schedules",["schedule_id"],["id"],ondelete="SET NULL")
    op.create_foreign_key("fk_scan_schedules_last_job_id_scan_jobs","scan_schedules","scan_jobs",["last_job_id"],["id"],ondelete="SET NULL")
    op.create_check_constraint("ck_scan_jobs_attempts","scan_jobs","attempt_count >= 0 AND max_attempts BETWEEN 1 AND 10")
    op.create_check_constraint("ck_scan_jobs_origin","scan_jobs","origin IN ('manual','schedule')")
    op.create_unique_constraint("uq_scan_jobs_schedule_occurrence","scan_jobs",["schedule_id","scheduled_for"])
    op.create_index("ix_scan_jobs_schedule_id","scan_jobs",["schedule_id"]);op.create_index("ix_scan_jobs_claimable","scan_jobs",["status","available_at","next_retry_at","lease_expires_at"]);op.create_index("ix_scan_jobs_lease_expiry","scan_jobs",["status","lease_expires_at"])
    op.create_unique_constraint("uq_finding_occurrences_raw_result_id","finding_occurrences",["raw_result_id"])


def downgrade():
    op.drop_constraint("uq_finding_occurrences_raw_result_id","finding_occurrences",type_="unique")
    op.drop_index("ix_scan_jobs_lease_expiry",table_name="scan_jobs");op.drop_index("ix_scan_jobs_claimable",table_name="scan_jobs");op.drop_index("ix_scan_jobs_schedule_id",table_name="scan_jobs");op.drop_constraint("uq_scan_jobs_schedule_occurrence","scan_jobs",type_="unique");op.drop_constraint("ck_scan_jobs_origin","scan_jobs",type_="check");op.drop_constraint("ck_scan_jobs_attempts","scan_jobs",type_="check");op.drop_constraint("fk_scan_schedules_last_job_id_scan_jobs","scan_schedules",type_="foreignkey");op.drop_constraint("fk_scan_jobs_schedule_id_scan_schedules","scan_jobs",type_="foreignkey")
    for name in ("scheduled_for","schedule_id","origin","worker_id","cancellation_requested_at","last_failure_summary","last_failure_code","next_retry_at","max_attempts","attempt_count","heartbeat_at","lease_expires_at","claimed_at","claim_token","available_at"):op.drop_column("scan_jobs",name)
    op.drop_table("scan_schedules")

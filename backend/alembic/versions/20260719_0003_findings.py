"""add workspace findings domain

Revision ID: 20260719_0003
Revises: 20260719_0002
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260719_0003"
down_revision = "20260719_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    uuid = postgresql.UUID(as_uuid=True)
    timestamp = sa.DateTime(timezone=True)
    op.create_table(
        "findings",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("organization_id", uuid, sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", uuid, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="open"),
        sa.Column("source", sa.String(120), nullable=False, server_default="manual"),
        sa.Column("external_id", sa.String(240)),
        sa.Column("remediation", sa.Text()),
        sa.Column("resolution_summary", sa.Text()),
        sa.Column("assignee_user_id", uuid, sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("updated_by", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", timestamp, nullable=False, server_default=sa.func.now()),
        sa.Column("acknowledged_at", timestamp), sa.Column("started_at", timestamp),
        sa.Column("resolved_at", timestamp), sa.Column("closed_at", timestamp), sa.Column("reopened_at", timestamp),
        sa.UniqueConstraint("workspace_id", "source", "external_id"),
        sa.CheckConstraint("status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed', 'reopened')", name=op.f("ck_findings_status")),
        sa.CheckConstraint("severity IN ('critical', 'high', 'medium', 'low', 'informational')", name=op.f("ck_findings_severity")),
        sa.CheckConstraint("version > 0", name=op.f("ck_findings_version")),
    )
    op.create_index("ix_findings_workspace_id", "findings", ["workspace_id"])
    op.create_index("ix_findings_assignee_user_id", "findings", ["assignee_user_id"])
    op.create_index("ix_findings_workspace_updated", "findings", ["workspace_id", "updated_at"])
    op.create_index("ix_findings_workspace_status_severity", "findings", ["workspace_id", "status", "severity"])

    for table_name, extra_columns in (
        ("finding_evidence", [sa.Column("kind", sa.String(20), nullable=False), sa.Column("title", sa.String(200), nullable=False), sa.Column("content", sa.Text(), nullable=False)]),
        ("finding_comments", [sa.Column("body", sa.Text(), nullable=False)]),
    ):
        op.create_table(
            table_name,
            sa.Column("id", uuid, primary_key=True),
            sa.Column("organization_id", uuid, sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("workspace_id", uuid, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
            sa.Column("finding_id", uuid, sa.ForeignKey("findings.id", ondelete="CASCADE"), nullable=False),
            *extra_columns,
            sa.Column("created_by", uuid, sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
            sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()),
        )
        op.create_index(f"ix_{table_name}_workspace_id", table_name, ["workspace_id"])
        op.create_index(f"ix_{table_name}_finding_id", table_name, ["finding_id"])
    op.create_check_constraint(op.f("ck_finding_evidence_kind"), "finding_evidence", "kind IN ('text', 'url', 'code')")

    op.create_table(
        "finding_activities",
        sa.Column("id", uuid, primary_key=True),
        sa.Column("organization_id", uuid, sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", uuid, sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("finding_id", uuid, sa.ForeignKey("findings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_id", uuid, sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("action", sa.String(120), nullable=False),
        sa.Column("from_status", sa.String(24)), sa.Column("to_status", sa.String(24)),
        sa.Column("changes", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", timestamp, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_finding_activities_workspace_id", "finding_activities", ["workspace_id"])
    op.create_index("ix_finding_activities_finding_created", "finding_activities", ["finding_id", "created_at"])


def downgrade() -> None:
    for table_name in ["finding_activities", "finding_comments", "finding_evidence", "findings"]:
        op.drop_table(table_name)

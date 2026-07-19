"""extend integration credential state

Revision ID: 20260719_0002
Revises: 20260718_0001
"""
from alembic import op
import sqlalchemy as sa

revision = "20260719_0002"
down_revision = "20260718_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("integration_credentials", sa.Column("status", sa.String(32), nullable=False, server_default="untested"))
    op.add_column("integration_credentials", sa.Column("last_tested_at", sa.DateTime(timezone=True)))
    op.add_column("integration_credentials", sa.Column("last_successful_test_at", sa.DateTime(timezone=True)))
    op.add_column("integration_credentials", sa.Column("last_failure_category", sa.String(32)))
    op.add_column("integration_credentials", sa.Column("updated_by", sa.UUID()))
    op.add_column("integration_credentials", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.execute("UPDATE integration_credentials SET updated_by = created_by WHERE updated_by IS NULL")
    op.alter_column("integration_credentials", "updated_by", nullable=False)
    op.create_foreign_key("fk_integration_credentials_updated_by_users", "integration_credentials", "users", ["updated_by"], ["id"], ondelete="RESTRICT")
    op.create_check_constraint(
        op.f("ck_integration_credentials_status"),
        "integration_credentials",
        "status IN ('untested', 'connected', 'invalid_credentials', 'unreachable', 'rate_limited', 'provider_error', 'configuration_error')",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_integration_credentials_status"), "integration_credentials", type_="check")
    op.drop_constraint("fk_integration_credentials_updated_by_users", "integration_credentials", type_="foreignkey")
    for column in ["updated_at", "updated_by", "last_failure_category", "last_successful_test_at", "last_tested_at", "status"]:
        op.drop_column("integration_credentials", column)

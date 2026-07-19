"""add workspace asset inventory and finding relationship

Revision ID: 20260719_0004
Revises: 20260719_0003
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision="20260719_0004"
down_revision="20260719_0003"
branch_labels=None
depends_on=None

PERMISSIONS={"asset:read":"Read workspace assets","asset:write":"Create and update workspace assets","asset:manage":"Manage asset ownership and activation"}
ROLE_GRANTS={
    "workspace_administrator":set(PERMISSIONS),
    "application_security_engineer":set(PERMISSIONS),
    "devsecops_engineer":{"asset:read","asset:write"},
    "secops_analyst":{"asset:read","asset:write"},
    "developer":{"asset:read"},
    "read_only":{"asset:read"},
}


def upgrade():
    uuid=postgresql.UUID(as_uuid=True); timestamp=sa.DateTime(timezone=True)
    permission=sa.table("appsec_permissions",sa.column("key",sa.String()),sa.column("description",sa.Text()))
    grants=sa.table("workspace_role_permissions",sa.column("role_key",sa.String()),sa.column("permission_key",sa.String()))
    op.bulk_insert(permission,[{"key":key,"description":description} for key,description in PERMISSIONS.items()])
    op.bulk_insert(grants,[{"role_key":role,"permission_key":key} for role,keys in ROLE_GRANTS.items() for key in sorted(keys)])
    op.create_table("assets",
        sa.Column("id",uuid,primary_key=True),sa.Column("workspace_id",uuid,sa.ForeignKey("workspaces.id",ondelete="CASCADE"),nullable=False),sa.Column("organization_id",uuid,sa.ForeignKey("organizations.id",ondelete="CASCADE"),nullable=False),
        sa.Column("name",sa.String(240),nullable=False),sa.Column("asset_type",sa.String(32),nullable=False),sa.Column("canonical_identifier",sa.String(1000),nullable=False),sa.Column("normalized_identifier",sa.String(1000),nullable=False),
        sa.Column("environment",sa.String(24),nullable=False,server_default="unknown"),sa.Column("criticality",sa.String(20),nullable=False,server_default="unclassified"),sa.Column("owner_user_id",uuid,sa.ForeignKey("users.id",ondelete="SET NULL")),
        sa.Column("description",sa.Text()),sa.Column("source",sa.String(120),nullable=False,server_default="manual"),sa.Column("external_id",sa.String(240)),sa.Column("is_active",sa.Boolean(),nullable=False,server_default=sa.true()),
        sa.Column("first_seen_at",timestamp,nullable=False,server_default=sa.func.now()),sa.Column("last_seen_at",timestamp,nullable=False,server_default=sa.func.now()),sa.Column("metadata_json",postgresql.JSONB(),nullable=False,server_default=sa.text("'{}'::jsonb")),
        sa.Column("version",sa.Integer(),nullable=False,server_default="1"),sa.Column("created_by",uuid,sa.ForeignKey("users.id",ondelete="RESTRICT"),nullable=False),sa.Column("updated_by",uuid,sa.ForeignKey("users.id",ondelete="RESTRICT"),nullable=False),sa.Column("created_at",timestamp,nullable=False,server_default=sa.func.now()),sa.Column("updated_at",timestamp,nullable=False,server_default=sa.func.now()),
        sa.UniqueConstraint("workspace_id","asset_type","normalized_identifier",name="uq_assets_workspace_id_asset_type_normalized_identifier"),
        sa.CheckConstraint("asset_type IN ('domain','subdomain','ip_address','url','repository','cloud_account','host','container_image','kubernetes_cluster','custom')",name="ck_assets_asset_type"),
        sa.CheckConstraint("criticality IN ('critical','high','medium','low','unclassified')",name="ck_assets_criticality"),
        sa.CheckConstraint("environment IN ('production','staging','development','testing','internal','external','unknown')",name="ck_assets_environment"),sa.CheckConstraint("version > 0",name="ck_assets_version"))
    op.create_index("ix_assets_workspace_id","assets",["workspace_id"]);op.create_index("ix_assets_owner_user_id","assets",["owner_user_id"]);op.create_index("ix_assets_workspace_updated","assets",["workspace_id","updated_at"]);op.create_index("ix_assets_workspace_type_active","assets",["workspace_id","asset_type","is_active"])
    op.create_table("asset_tags",sa.Column("id",uuid,primary_key=True),sa.Column("organization_id",uuid,sa.ForeignKey("organizations.id",ondelete="CASCADE"),nullable=False),sa.Column("workspace_id",uuid,sa.ForeignKey("workspaces.id",ondelete="CASCADE"),nullable=False),sa.Column("display_name",sa.String(80),nullable=False),sa.Column("normalized_name",sa.String(80),nullable=False),sa.Column("created_by",uuid,sa.ForeignKey("users.id",ondelete="RESTRICT"),nullable=False),sa.Column("created_at",timestamp,nullable=False,server_default=sa.func.now()),sa.UniqueConstraint("workspace_id","normalized_name",name="uq_asset_tags_workspace_id_normalized_name"))
    op.create_index("ix_asset_tags_workspace_id","asset_tags",["workspace_id"])
    op.create_table("asset_tag_links",sa.Column("asset_id",uuid,sa.ForeignKey("assets.id",ondelete="CASCADE"),primary_key=True),sa.Column("tag_id",uuid,sa.ForeignKey("asset_tags.id",ondelete="CASCADE"),primary_key=True),sa.Column("created_by",uuid,sa.ForeignKey("users.id",ondelete="RESTRICT"),nullable=False),sa.Column("created_at",timestamp,nullable=False,server_default=sa.func.now()))
    op.add_column("findings",sa.Column("asset_id",uuid,nullable=True));op.create_foreign_key("fk_findings_asset_id_assets","findings","assets",["asset_id"],["id"],ondelete="SET NULL");op.create_index("ix_findings_asset_id","findings",["asset_id"])


def downgrade():
    op.drop_index("ix_findings_asset_id",table_name="findings");op.drop_constraint("fk_findings_asset_id_assets","findings",type_="foreignkey");op.drop_column("findings","asset_id")
    op.drop_table("asset_tag_links");op.drop_table("asset_tags");op.drop_table("assets")
    op.execute(sa.text("DELETE FROM workspace_role_permissions WHERE permission_key IN ('asset:read','asset:write','asset:manage')"));op.execute(sa.text("DELETE FROM appsec_permissions WHERE key IN ('asset:read','asset:write','asset:manage')"))

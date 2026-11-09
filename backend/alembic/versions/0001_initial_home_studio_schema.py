"""Initial HMX Home Studio 16-table relational & JSONB schema

Revision ID: 0001_initial_home_studio
Revises: None
Create Date: 2026-11-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial_home_studio"
down_revision = None
branch_labels = None
depends_on = None

PortableJSONB = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    # 1. users
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("hash_algorithm", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. user_profiles
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(length=64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("organization", sa.String(length=160), nullable=True),
        sa.Column("preferred_unit", sa.String(length=16), nullable=False),
        sa.Column("default_city", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 3. home_studio_projects
    op.create_table(
        "home_studio_projects",
        sa.Column("id", sa.String(length=128), primary_key=True),
        sa.Column(
            "owner_id",
            sa.String(length=64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location", sa.String(length=160), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("plot_width_ft", sa.Float(), nullable=False),
        sa.Column("plot_length_ft", sa.Float(), nullable=False),
        sa.Column("floor_count", sa.Integer(), nullable=False),
        sa.Column("built_up_area_sqft", sa.Float(), nullable=False),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_projects_owner_updated",
        "home_studio_projects",
        ["owner_id", "updated_at"],
    )

    # 4. building_project_data
    op.create_table(
        "building_project_data",
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("canonical_payload", PortableJSONB, nullable=False),
        sa.Column("plot_config", PortableJSONB, nullable=False),
        sa.Column("camera_view_settings", PortableJSONB, nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 5. project_floors
    op.create_table(
        "project_floors",
        sa.Column("id", sa.String(length=128), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("floor_type", sa.String(length=48), nullable=False),
        sa.Column("level_index", sa.Integer(), nullable=False),
        sa.Column("elevation_ft", sa.Float(), nullable=False),
        sa.Column("floor_thickness_ft", sa.Float(), nullable=False),
        sa.Column("ceiling_height_ft", sa.Float(), nullable=False),
        sa.Column("visible", sa.Boolean(), nullable=False),
        sa.Column("locked", sa.Boolean(), nullable=False),
    )
    op.create_index(
        "ix_floors_project_level", "project_floors", ["project_id", "level_index"]
    )

    # 6. project_rooms
    op.create_table(
        "project_rooms",
        sa.Column("id", sa.String(length=128), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "floor_id",
            sa.String(length=128),
            sa.ForeignKey("project_floors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("room_type", sa.String(length=64), nullable=False),
        sa.Column("width_ft", sa.Float(), nullable=False),
        sa.Column("length_ft", sa.Float(), nullable=False),
        sa.Column("area_sqft", sa.Float(), nullable=False),
        sa.Column("polygon", PortableJSONB, nullable=False),
        sa.Column("floor_material_id", sa.String(length=128), nullable=False),
        sa.Column("wall_material_id", sa.String(length=128), nullable=False),
        sa.Column("ceiling_material_id", sa.String(length=128), nullable=True),
        sa.Column("color", sa.String(length=32), nullable=False),
    )

    # 7. project_walls
    op.create_table(
        "project_walls",
        sa.Column("id", sa.String(length=128), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "floor_id",
            sa.String(length=128),
            sa.ForeignKey("project_floors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("start_point", PortableJSONB, nullable=False),
        sa.Column("end_point", PortableJSONB, nullable=False),
        sa.Column("height_ft", sa.Float(), nullable=False),
        sa.Column("thickness_ft", sa.Float(), nullable=False),
        sa.Column("material_id", sa.String(length=128), nullable=False),
        sa.Column("is_exterior", sa.Boolean(), nullable=False),
        sa.Column("is_structural", sa.Boolean(), nullable=False),
    )

    # 8. project_openings
    op.create_table(
        "project_openings",
        sa.Column("id", sa.String(length=128), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "floor_id",
            sa.String(length=128),
            sa.ForeignKey("project_floors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("wall_id", sa.String(length=128), nullable=False),
        sa.Column("opening_type", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("position_norm", sa.Float(), nullable=False),
        sa.Column("offset_from_start_ft", sa.Float(), nullable=False),
        sa.Column("width_ft", sa.Float(), nullable=False),
        sa.Column("height_ft", sa.Float(), nullable=False),
        sa.Column("sill_height_ft", sa.Float(), nullable=False),
        sa.Column("material_id", sa.String(length=128), nullable=False),
        sa.Column("swing_direction", sa.String(length=32), nullable=True),
    )

    # 9. project_furniture
    op.create_table(
        "project_furniture",
        sa.Column("id", sa.String(length=128), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "floor_id",
            sa.String(length=128),
            sa.ForeignKey("project_floors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("asset_id", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("position_3d", PortableJSONB, nullable=False),
        sa.Column("rotation_deg", sa.Float(), nullable=False),
        sa.Column("dimensions_3d", PortableJSONB, nullable=False),
        sa.Column("scale_3d", PortableJSONB, nullable=False),
        sa.Column("material_id", sa.String(length=128), nullable=False),
        sa.Column("color", sa.String(length=32), nullable=False),
        sa.Column("is_structural", sa.Boolean(), nullable=False),
        sa.Column("stair_metadata", PortableJSONB, nullable=True),
    )

    # 10. project_material_assignments
    op.create_table(
        "project_material_assignments",
        sa.Column("id", sa.String(length=160), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("material_id", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("color", sa.String(length=32), nullable=False),
        sa.Column("roughness", sa.Float(), nullable=False),
        sa.Column("metalness", sa.Float(), nullable=False),
        sa.Column("tile_scale", sa.Float(), nullable=False),
        sa.Column("finish_quality", sa.String(length=32), nullable=False),
        sa.Column("unit_cost_per_sqft", sa.Float(), nullable=False),
    )

    # 11. project_building_settings
    op.create_table(
        "project_building_settings",
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("default_wall_height_ft", sa.Float(), nullable=False),
        sa.Column("default_wall_thickness_ft", sa.Float(), nullable=False),
        sa.Column("roof_type", sa.String(length=32), nullable=False),
        sa.Column("roof_slope_deg", sa.Float(), nullable=False),
        sa.Column("parapet_height_ft", sa.Float(), nullable=False),
        sa.Column("environment_preset", sa.String(length=32), nullable=False),
        sa.Column("sun_azimuth", sa.Float(), nullable=False),
        sa.Column("sun_elevation", sa.Float(), nullable=False),
        sa.Column("shadows_enabled", sa.Boolean(), nullable=False),
        sa.Column("lighting_config", PortableJSONB, nullable=False),
        sa.Column("cost_config", PortableJSONB, nullable=False),
    )

    # 12. construction_estimates
    op.create_table(
        "construction_estimates",
        sa.Column("id", sa.String(length=128), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("finish_tier", sa.String(length=32), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=False),
        sa.Column("material_cost_inr", sa.Float(), nullable=False),
        sa.Column("labour_cost_inr", sa.Float(), nullable=False),
        sa.Column("equipment_cost_inr", sa.Float(), nullable=False),
        sa.Column("subtotal_inr", sa.Float(), nullable=False),
        sa.Column("overheads_inr", sa.Float(), nullable=False),
        sa.Column("contingency_inr", sa.Float(), nullable=False),
        sa.Column("final_estimated_cost_inr", sa.Float(), nullable=False),
        sa.Column("cost_per_sqft_inr", sa.Float(), nullable=False),
        sa.Column("applicable_taxes_inr", sa.Float(), nullable=False),
        sa.Column("total_with_taxes_inr", sa.Float(), nullable=False),
        sa.Column("estimate_snapshot", PortableJSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 13. estimation_assumptions
    op.create_table(
        "estimation_assumptions",
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("foundation_depth_ft", sa.Float(), nullable=False),
        sa.Column("foundation_width_ft", sa.Float(), nullable=False),
        sa.Column("soil_type", sa.String(length=64), nullable=False),
        sa.Column("footing_steel_kg_per_cum", sa.Float(), nullable=False),
        sa.Column("column_beam_steel_kg_per_cum", sa.Float(), nullable=False),
        sa.Column("slab_stair_steel_kg_per_cum", sa.Float(), nullable=False),
        sa.Column("flooring_wastage_percent", sa.Float(), nullable=False),
        sa.Column("assumptions_json", PortableJSONB, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 14. material_labour_rate_overrides
    op.create_table(
        "material_labour_rate_overrides",
        sa.Column("id", sa.String(length=160), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("rate_type", sa.String(length=32), nullable=False),
        sa.Column("rate_key", sa.String(length=128), nullable=False),
        sa.Column("custom_rate_inr", sa.Float(), nullable=False),
        sa.Column("source_note", sa.String(length=200), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("project_id", "rate_key", name="uq_project_rate_key"),
    )

    # 15. project_versions
    op.create_table(
        "project_versions",
        sa.Column("id", sa.String(length=160), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("summary", sa.String(length=255), nullable=False),
        sa.Column("snapshot_payload", PortableJSONB, nullable=False),
        sa.Column("created_by", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "project_id", "version_number", name="uq_project_version_num"
        ),
    )
    op.create_index(
        "ix_versions_project_version",
        "project_versions",
        ["project_id", "version_number"],
    )

    # 16. report_metadata
    op.create_table(
        "report_metadata",
        sa.Column("id", sa.String(length=128), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(length=128),
            sa.ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "owner_id",
            sa.String(length=64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("report_type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("project_version", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("page_count", sa.Integer(), nullable=False),
        sa.Column("summary_metrics", PortableJSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_reports_project_owner", "report_metadata", ["project_id", "owner_id"]
    )


def downgrade() -> None:
    op.drop_table("report_metadata")
    op.drop_table("project_versions")
    op.drop_table("material_labour_rate_overrides")
    op.drop_table("estimation_assumptions")
    op.drop_table("construction_estimates")
    op.drop_table("project_building_settings")
    op.drop_table("project_material_assignments")
    op.drop_table("project_furniture")
    op.drop_table("project_openings")
    op.drop_table("project_walls")
    op.drop_table("project_rooms")
    op.drop_table("project_floors")
    op.drop_table("building_project_data")
    op.drop_table("home_studio_projects")
    op.drop_table("user_profiles")
    op.drop_table("users")


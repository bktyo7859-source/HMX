"""
HMX Home Studio — SQLAlchemy 2.0 Relational + JSONB Database Schema (Phase 9.1)
Covers all 16 architectural, cost-estimation, versioning, and report entities.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Index,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

try:
    from database import Base
except ImportError:
    from backend.database import Base

# Portable JSONB column that uses PostgreSQL native JSONB in production and JSON on local SQLite
PortableJSONB = JSON().with_variant(JSONB, "postgresql")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# 1. Users
class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(512), nullable=False)
    hash_algorithm = Column(String(64), nullable=False, default="argon2id")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    profile = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    projects = relationship(
        "HomeStudioProjectRecord",
        back_populates="owner",
        cascade="all, delete-orphan",
    )


# 2. User Profiles
class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String(64), primary_key=True)
    user_id = Column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    full_name = Column(String(160), nullable=False)
    organization = Column(String(160), nullable=True)
    preferred_unit = Column(String(16), nullable=False, default="ft")
    default_city = Column(String(120), nullable=False, default="Bengaluru, Karnataka")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    user = relationship("User", back_populates="profile")


# 3. Home Studio Projects (Relational Metadata + Ownership)
class HomeStudioProjectRecord(Base):
    __tablename__ = "home_studio_projects"
    __table_args__ = (
        Index("ix_projects_owner_updated", "owner_id", "updated_at"),
    )

    id = Column(String(128), primary_key=True, index=True)
    owner_id = Column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=False, default="")
    location = Column(String(160), nullable=False, default="Bengaluru, Karnataka")
    schema_version = Column(Integer, nullable=False, default=1)
    version = Column(Integer, nullable=False, default=1)
    plot_width_ft = Column(Float, nullable=False, default=40.0)
    plot_length_ft = Column(Float, nullable=False, default=60.0)
    floor_count = Column(Integer, nullable=False, default=1)
    built_up_area_sqft = Column(Float, nullable=False, default=0.0)
    is_archived = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    owner = relationship("User", back_populates="projects")
    project_data = relationship(
        "BuildingProjectDataRecord",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )
    floors = relationship(
        "FloorRecord", back_populates="project", cascade="all, delete-orphan"
    )
    materials = relationship(
        "MaterialAssignmentRecord",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    settings = relationship(
        "BuildingSettingsRecord",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )
    estimates = relationship(
        "ConstructionEstimateRecord",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    assumptions = relationship(
        "EstimationAssumptionsRecord",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )
    rate_overrides = relationship(
        "RateOverrideRecord",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    versions = relationship(
        "ProjectVersionRecord",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    reports = relationship(
        "ReportMetadataRecord",
        back_populates="project",
        cascade="all, delete-orphan",
    )


# 4. Building Project Data (Validated Canonical JSONB Payload)
class BuildingProjectDataRecord(Base):
    __tablename__ = "building_project_data"

    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    canonical_payload = Column(PortableJSONB, nullable=False)
    plot_config = Column(PortableJSONB, nullable=False)
    camera_view_settings = Column(PortableJSONB, nullable=True)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    project = relationship("HomeStudioProjectRecord", back_populates="project_data")


# 5. Floors
class FloorRecord(Base):
    __tablename__ = "project_floors"
    __table_args__ = (
        Index("ix_floors_project_level", "project_id", "level_index"),
    )

    id = Column(String(128), primary_key=True)
    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(120), nullable=False)
    floor_type = Column(String(48), nullable=False, default="ground")
    level_index = Column(Integer, nullable=False, default=0)
    elevation_ft = Column(Float, nullable=False, default=0.0)
    floor_thickness_ft = Column(Float, nullable=False, default=0.5)
    ceiling_height_ft = Column(Float, nullable=False, default=10.5)
    visible = Column(Boolean, nullable=False, default=True)
    locked = Column(Boolean, nullable=False, default=False)

    project = relationship("HomeStudioProjectRecord", back_populates="floors")
    rooms = relationship(
        "RoomRecord", back_populates="floor", cascade="all, delete-orphan"
    )
    walls = relationship(
        "WallRecord", back_populates="floor", cascade="all, delete-orphan"
    )
    openings = relationship(
        "OpeningRecord", back_populates="floor", cascade="all, delete-orphan"
    )
    furniture = relationship(
        "FurnitureRecord", back_populates="floor", cascade="all, delete-orphan"
    )


# 6. Rooms
class RoomRecord(Base):
    __tablename__ = "project_rooms"

    id = Column(String(128), primary_key=True)
    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    floor_id = Column(
        String(128),
        ForeignKey("project_floors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(120), nullable=False)
    room_type = Column(String(64), nullable=False)
    width_ft = Column(Float, nullable=False, default=10.0)
    length_ft = Column(Float, nullable=False, default=10.0)
    area_sqft = Column(Float, nullable=False, default=100.0)
    polygon = Column(PortableJSONB, nullable=False)
    floor_material_id = Column(String(128), nullable=False)
    wall_material_id = Column(String(128), nullable=False)
    ceiling_material_id = Column(String(128), nullable=True)
    color = Column(String(32), nullable=False, default="#F4EFE6")

    floor = relationship("FloorRecord", back_populates="rooms")


# 7. Walls
class WallRecord(Base):
    __tablename__ = "project_walls"

    id = Column(String(128), primary_key=True)
    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    floor_id = Column(
        String(128),
        ForeignKey("project_floors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_point = Column(PortableJSONB, nullable=False)
    end_point = Column(PortableJSONB, nullable=False)
    height_ft = Column(Float, nullable=False, default=10.5)
    thickness_ft = Column(Float, nullable=False, default=0.75)
    material_id = Column(String(128), nullable=False)
    is_exterior = Column(Boolean, nullable=False, default=False)
    is_structural = Column(Boolean, nullable=False, default=False)

    floor = relationship("FloorRecord", back_populates="walls")


# 8. Openings (Doors & Windows)
class OpeningRecord(Base):
    __tablename__ = "project_openings"

    id = Column(String(128), primary_key=True)
    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    floor_id = Column(
        String(128),
        ForeignKey("project_floors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    wall_id = Column(String(128), nullable=False, index=True)
    opening_type = Column(String(64), nullable=False)
    name = Column(String(120), nullable=False)
    position_norm = Column(Float, nullable=False, default=0.5)
    offset_from_start_ft = Column(Float, nullable=False, default=1.0)
    width_ft = Column(Float, nullable=False, default=3.0)
    height_ft = Column(Float, nullable=False, default=7.0)
    sill_height_ft = Column(Float, nullable=False, default=0.0)
    material_id = Column(String(128), nullable=False)
    swing_direction = Column(String(32), nullable=True)

    floor = relationship("FloorRecord", back_populates="openings")


# 9. Furniture & Staircases
class FurnitureRecord(Base):
    __tablename__ = "project_furniture"

    id = Column(String(128), primary_key=True)
    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    floor_id = Column(
        String(128),
        ForeignKey("project_floors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_id = Column(String(128), nullable=False)
    name = Column(String(160), nullable=False)
    category = Column(String(64), nullable=False)
    position_3d = Column(PortableJSONB, nullable=False)
    rotation_deg = Column(Float, nullable=False, default=0.0)
    dimensions_3d = Column(PortableJSONB, nullable=False)
    scale_3d = Column(PortableJSONB, nullable=False)
    material_id = Column(String(128), nullable=False)
    color = Column(String(32), nullable=False, default="#D5C7B2")
    is_structural = Column(Boolean, nullable=False, default=False)
    stair_metadata = Column(PortableJSONB, nullable=True)

    floor = relationship("FloorRecord", back_populates="furniture")


# 10. Material Assignments & Custom Materials
class MaterialAssignmentRecord(Base):
    __tablename__ = "project_material_assignments"

    id = Column(String(160), primary_key=True)
    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    material_id = Column(String(128), nullable=False)
    name = Column(String(160), nullable=False)
    category = Column(String(64), nullable=False)
    color = Column(String(32), nullable=False)
    roughness = Column(Float, nullable=False, default=0.5)
    metalness = Column(Float, nullable=False, default=0.0)
    tile_scale = Column(Float, nullable=False, default=1.0)
    finish_quality = Column(String(32), nullable=False, default="standard")
    unit_cost_per_sqft = Column(Float, nullable=False, default=120.0)

    project = relationship("HomeStudioProjectRecord", back_populates="materials")


# 11. Building Settings & Lighting Configuration
class BuildingSettingsRecord(Base):
    __tablename__ = "project_building_settings"

    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    default_wall_height_ft = Column(Float, nullable=False, default=10.5)
    default_wall_thickness_ft = Column(Float, nullable=False, default=0.75)
    roof_type = Column(String(32), nullable=False, default="flat")
    roof_slope_deg = Column(Float, nullable=False, default=0.0)
    parapet_height_ft = Column(Float, nullable=False, default=3.25)
    environment_preset = Column(String(32), nullable=False, default="daylight")
    sun_azimuth = Column(Float, nullable=False, default=135.0)
    sun_elevation = Column(Float, nullable=False, default=55.0)
    shadows_enabled = Column(Boolean, nullable=False, default=True)
    lighting_config = Column(PortableJSONB, nullable=False)
    cost_config = Column(PortableJSONB, nullable=False)

    project = relationship("HomeStudioProjectRecord", back_populates="settings")


# 12. Construction Estimates
class ConstructionEstimateRecord(Base):
    __tablename__ = "construction_estimates"

    id = Column(String(128), primary_key=True)
    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    finish_tier = Column(String(32), nullable=False, default="standard")
    location = Column(String(120), nullable=False)
    material_cost_inr = Column(Float, nullable=False)
    labour_cost_inr = Column(Float, nullable=False)
    equipment_cost_inr = Column(Float, nullable=False)
    subtotal_inr = Column(Float, nullable=False)
    overheads_inr = Column(Float, nullable=False)
    contingency_inr = Column(Float, nullable=False)
    final_estimated_cost_inr = Column(Float, nullable=False)
    cost_per_sqft_inr = Column(Float, nullable=False)
    applicable_taxes_inr = Column(Float, nullable=False, default=0.0)
    total_with_taxes_inr = Column(Float, nullable=False, default=0.0)
    estimate_snapshot = Column(PortableJSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    project = relationship("HomeStudioProjectRecord", back_populates="estimates")


# 13. Estimation Assumptions
class EstimationAssumptionsRecord(Base):
    __tablename__ = "estimation_assumptions"

    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    foundation_depth_ft = Column(Float, nullable=False, default=5.0)
    foundation_width_ft = Column(Float, nullable=False, default=3.5)
    soil_type = Column(String(64), nullable=False, default="medium_clay_sand")
    footing_steel_kg_per_cum = Column(Float, nullable=False, default=95.0)
    column_beam_steel_kg_per_cum = Column(Float, nullable=False, default=145.0)
    slab_stair_steel_kg_per_cum = Column(Float, nullable=False, default=90.0)
    flooring_wastage_percent = Column(Float, nullable=False, default=7.0)
    assumptions_json = Column(PortableJSONB, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    project = relationship("HomeStudioProjectRecord", back_populates="assumptions")


# 14. Material and Labour Rate Overrides
class RateOverrideRecord(Base):
    __tablename__ = "material_labour_rate_overrides"
    __table_args__ = (
        UniqueConstraint("project_id", "rate_key", name="uq_project_rate_key"),
    )

    id = Column(String(160), primary_key=True)
    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rate_type = Column(String(32), nullable=False)  # "material" | "labour"
    rate_key = Column(String(128), nullable=False)
    custom_rate_inr = Column(Float, nullable=False)
    source_note = Column(
        String(200), nullable=False, default="User Verified Supplier Rate"
    )
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    project = relationship("HomeStudioProjectRecord", back_populates="rate_overrides")


# 15. Project Versions and Revision History
class ProjectVersionRecord(Base):
    __tablename__ = "project_versions"
    __table_args__ = (
        UniqueConstraint("project_id", "version_number", name="uq_project_version_num"),
        Index("ix_versions_project_version", "project_id", "version_number"),
    )

    id = Column(String(160), primary_key=True)
    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number = Column(Integer, nullable=False)
    summary = Column(String(255), nullable=False, default="Saved revision")
    snapshot_payload = Column(PortableJSONB, nullable=False)
    created_by = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    project = relationship("HomeStudioProjectRecord", back_populates="versions")


# 16. Report Metadata
class ReportMetadataRecord(Base):
    __tablename__ = "report_metadata"
    __table_args__ = (
        Index("ix_reports_project_owner", "project_id", "owner_id"),
    )

    id = Column(String(128), primary_key=True)
    project_id = Column(
        String(128),
        ForeignKey("home_studio_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_id = Column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    report_type = Column(String(64), nullable=False)
    title = Column(String(200), nullable=False)
    project_version = Column(Integer, nullable=False, default=1)
    file_name = Column(String(255), nullable=False)
    page_count = Column(Integer, nullable=False, default=1)
    summary_metrics = Column(PortableJSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    project = relationship("HomeStudioProjectRecord", back_populates="reports")


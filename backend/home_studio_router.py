"""
HMX Home Studio — FastAPI Router for Persistent Projects, Auth, Versioning & Reports (Phase 9 & 10)
Synchronizes the canonical BuildingProject payload across all 16 relational + JSONB tables.
"""

import uuid
import copy
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

try:
    from database import get_db, engine, Base, check_database_health
    from models_db import (
        User,
        UserProfile,
        HomeStudioProjectRecord,
        BuildingProjectDataRecord,
        FloorRecord,
        RoomRecord,
        WallRecord,
        OpeningRecord,
        FurnitureRecord,
        MaterialAssignmentRecord,
        BuildingSettingsRecord,
        ConstructionEstimateRecord,
        EstimationAssumptionsRecord,
        RateOverrideRecord,
        ProjectVersionRecord,
        ReportMetadataRecord,
        utc_now,
    )
    from auth_security import (
        hash_password,
        verify_password,
        create_session_token,
        set_auth_cookie,
        clear_auth_cookie,
        auth_rate_limiter,
        get_current_user,
        verify_project_ownership,
    )
except ImportError:
    from backend.database import get_db, engine, Base, check_database_health
    from backend.models_db import (
        User,
        UserProfile,
        HomeStudioProjectRecord,
        BuildingProjectDataRecord,
        FloorRecord,
        RoomRecord,
        WallRecord,
        OpeningRecord,
        FurnitureRecord,
        MaterialAssignmentRecord,
        BuildingSettingsRecord,
        ConstructionEstimateRecord,
        EstimationAssumptionsRecord,
        RateOverrideRecord,
        ProjectVersionRecord,
        ReportMetadataRecord,
        utc_now,
    )
    from backend.auth_security import (
        hash_password,
        verify_password,
        create_session_token,
        set_auth_cookie,
        clear_auth_cookie,
        auth_rate_limiter,
        get_current_user,
        verify_project_ownership,
    )

# Ensure tables exist in local/dev if Alembic has not been executed yet
Base.metadata.create_all(bind=engine)

router = APIRouter(prefix="/home-studio", tags=["HMX Home Studio"])


# --- Pydantic Schemas ---

class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    fullName: str = Field(..., min_length=2, max_length=160)
    organization: Optional[str] = Field(default=None, max_length=160)
    preferredUnit: str = Field(default="ft", pattern="^(ft|m)$")
    defaultCity: str = Field(default="Bengaluru, Karnataka", max_length=120)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean.split("@")[-1]:
            raise ValueError("Please provide a valid email address.")
        return clean


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class SaveProjectRequest(BaseModel):
    project: Dict[str, Any]
    expectedVersion: Optional[int] = None
    changeSummary: Optional[str] = Field(default="Saved architectural update", max_length=255)
    assumptions: Optional[Dict[str, Any]] = None
    estimateSnapshot: Optional[Dict[str, Any]] = None


class ImportLocalProjectsRequest(BaseModel):
    projects: List[Dict[str, Any]]


class CreateReportMetadataRequest(BaseModel):
    reportType: str = Field(..., pattern="^(architectural_design|construction_boq|detailed_cost|project_summary)$")
    title: str = Field(..., min_length=2, max_length=200)
    projectVersion: int = Field(default=1, ge=1)
    fileName: str = Field(..., min_length=3, max_length=255)
    pageCount: int = Field(default=1, ge=1)
    summaryMetrics: Dict[str, Any] = Field(default_factory=dict)


# --- Helper: Validate & Synchronize Canonical BuildingProject into Relational Tables ---

def _validate_building_project_payload(payload: Dict[str, Any]) -> None:
    required_keys = ["id", "name", "plot", "floors", "materials", "settings"]
    for k in required_keys:
        if k not in payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid BuildingProject payload: missing required field '{k}'.",
            )
    plot = payload.get("plot", {})
    if float(plot.get("width", 0)) <= 0 or float(plot.get("length", 0)) <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid PlotConfig: plot width and length must be positive feet values.",
        )
    floors = payload.get("floors", [])
    if not isinstance(floors, list) or len(floors) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid BuildingProject: project must contain at least one floor.",
        )


def _compute_built_up_area_sqft(payload: Dict[str, Any]) -> float:
    total = 0.0
    for flr in payload.get("floors", []):
        carpet = sum(
            max(0.0, float(r.get("dimensions", {}).get("area", 0.0)))
            for r in flr.get("rooms", [])
        )
        total += carpet * 1.15
    return round(total, 2)


def _sync_project_relational_entities(
    db: Session,
    record: HomeStudioProjectRecord,
    canonical_payload: Dict[str, Any],
    user_id: str,
    summary: str,
    assumptions: Optional[Dict[str, Any]] = None,
    estimate_snapshot: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Synchronizes the canonical BuildingProject payload into relational tables
    (floors, rooms, walls, openings, furniture, materials, settings, assumptions,
    rate overrides, estimates, and version history).
    """
    project_id = record.id
    now_iso = datetime.now(timezone.utc).isoformat()
    canonical_payload["ownerId"] = user_id
    canonical_payload["updatedAt"] = now_iso
    canonical_payload["version"] = record.version

    # Upsert BuildingProjectDataRecord
    if record.project_data is None:
        record.project_data = BuildingProjectDataRecord(
            project_id=project_id,
            canonical_payload=canonical_payload,
            plot_config=canonical_payload.get("plot", {}),
            camera_view_settings=canonical_payload.get("cameraViewSettings"),
        )
    else:
        record.project_data.canonical_payload = canonical_payload
        record.project_data.plot_config = canonical_payload.get("plot", {})
        record.project_data.camera_view_settings = canonical_payload.get("cameraViewSettings")

    # Replace child relational floors/rooms/walls/openings/furniture cleanly
    db.query(FloorRecord).filter(FloorRecord.project_id == project_id).delete()
    db.flush()

    for flr in canonical_payload.get("floors", []):
        flr_id = f"{project_id}::{flr.get('id', uuid.uuid4().hex[:8])}"
        floor_rec = FloorRecord(
            id=flr_id,
            project_id=project_id,
            name=str(flr.get("name", "Floor")),
            floor_type=str(flr.get("type", "ground")),
            level_index=int(flr.get("levelIndex", 0)),
            elevation_ft=float(flr.get("elevation", 0.0)),
            floor_thickness_ft=float(flr.get("floorHeight", 0.5)),
            ceiling_height_ft=float(flr.get("ceilingHeight", 10.5)),
            visible=bool(flr.get("visible", True)),
            locked=bool(flr.get("locked", False)),
        )
        db.add(floor_rec)

        for rm in flr.get("rooms", []):
            dims = rm.get("dimensions", {})
            db.add(
                RoomRecord(
                    id=f"{flr_id}::{rm.get('id', uuid.uuid4().hex[:8])}",
                    project_id=project_id,
                    floor_id=flr_id,
                    name=str(rm.get("name", "Room")),
                    room_type=str(rm.get("type", "bedroom")),
                    width_ft=float(dims.get("width", 10.0)),
                    length_ft=float(dims.get("length", 10.0)),
                    area_sqft=float(dims.get("area", 100.0)),
                    polygon=rm.get("polygon", []),
                    floor_material_id=str(rm.get("floorMaterialId", "mat-marble-carrara")),
                    wall_material_id=str(rm.get("wallMaterialId", "mat-paint-ivory")),
                    ceiling_material_id=rm.get("ceilingMaterialId"),
                    color=str(rm.get("color", "#F4EFE6")),
                )
            )

        for wl in flr.get("walls", []):
            db.add(
                WallRecord(
                    id=f"{flr_id}::{wl.get('id', uuid.uuid4().hex[:8])}",
                    project_id=project_id,
                    floor_id=flr_id,
                    start_point=wl.get("startPoint", {"x": 0, "y": 0}),
                    end_point=wl.get("endPoint", {"x": 10, "y": 0}),
                    height_ft=float(wl.get("height", 10.5)),
                    thickness_ft=float(wl.get("thickness", 0.75)),
                    material_id=str(wl.get("materialId", "mat-paint-ivory")),
                    is_exterior=bool(wl.get("isExterior", False)),
                    is_structural=bool(wl.get("isStructural", False)),
                )
            )

        for op in flr.get("openings", []):
            db.add(
                OpeningRecord(
                    id=f"{flr_id}::{op.get('id', uuid.uuid4().hex[:8])}",
                    project_id=project_id,
                    floor_id=flr_id,
                    wall_id=str(op.get("wallId", "")),
                    opening_type=str(op.get("type", "door")),
                    name=str(op.get("name", "Opening")),
                    position_norm=float(op.get("position", 0.5)),
                    offset_from_start_ft=float(op.get("offsetFromStart", 1.0)),
                    width_ft=float(op.get("width", 3.0)),
                    height_ft=float(op.get("height", 7.0)),
                    sill_height_ft=float(op.get("sillHeight", 0.0)),
                    material_id=str(op.get("materialId", "mat-wood-oak")),
                    swing_direction=op.get("swingDirection"),
                )
            )

        for fn in flr.get("objects", []):
            db.add(
                FurnitureRecord(
                    id=f"{flr_id}::{fn.get('id', uuid.uuid4().hex[:8])}",
                    project_id=project_id,
                    floor_id=flr_id,
                    asset_id=str(fn.get("assetId", "asset-custom")),
                    name=str(fn.get("name", "Furniture")),
                    category=str(fn.get("category", "sofas")),
                    position_3d=fn.get("position", {"x": 0, "y": 0, "z": 0}),
                    rotation_deg=float(fn.get("rotation", 0.0)),
                    dimensions_3d=fn.get("dimensions", {"width": 3, "depth": 3, "height": 3}),
                    scale_3d=fn.get("scale", {"x": 1, "y": 1, "z": 1}),
                    material_id=str(fn.get("materialId", "mat-wood-oak")),
                    color=str(fn.get("color", "#D5C7B2")),
                    is_structural=bool(fn.get("isStructural", False)),
                    stair_metadata=fn.get("stairMetadata"),
                )
            )

    # Material Assignments
    db.query(MaterialAssignmentRecord).filter(
        MaterialAssignmentRecord.project_id == project_id
    ).delete()
    for mat in canonical_payload.get("materials", []):
        mat_id = str(mat.get("id", uuid.uuid4().hex[:8]))
        db.add(
            MaterialAssignmentRecord(
                id=f"{project_id}::{mat_id}",
                project_id=project_id,
                material_id=mat_id,
                name=str(mat.get("name", "Material")),
                category=str(mat.get("category", "wall")),
                color=str(mat.get("color", "#F5F2EB")),
                roughness=float(mat.get("roughness", 0.5)),
                metalness=float(mat.get("metalness", 0.0)),
                tile_scale=float(mat.get("tileScale", 1.0)),
                finish_quality=str(mat.get("finishQuality", "standard")),
                unit_cost_per_sqft=float(mat.get("unitCostPerSqFt", 120.0)),
            )
        )

    # Building Settings & Lighting
    settings_dict = canonical_payload.get("settings", {})
    lighting_dict = settings_dict.get("lighting", {})
    cost_cfg_dict = settings_dict.get("costConfig", {})
    if record.settings is None:
        record.settings = BuildingSettingsRecord(
            project_id=project_id,
            default_wall_height_ft=float(settings_dict.get("defaultWallHeight", 10.5)),
            default_wall_thickness_ft=float(settings_dict.get("defaultWallThickness", 0.75)),
            roof_type=str(settings_dict.get("roofType", "flat")),
            roof_slope_deg=float(settings_dict.get("roofSlopeAngle", 0.0)),
            parapet_height_ft=float(settings_dict.get("parapetHeight", 3.25)),
            environment_preset=str(lighting_dict.get("environmentPreset", "daylight")),
            sun_azimuth=float(lighting_dict.get("sunAzimuth", 135.0)),
            sun_elevation=float(lighting_dict.get("sunElevation", 55.0)),
            shadows_enabled=bool(lighting_dict.get("shadowsEnabled", True)),
            lighting_config=lighting_dict,
            cost_config=cost_cfg_dict,
        )
    else:
        record.settings.default_wall_height_ft = float(settings_dict.get("defaultWallHeight", 10.5))
        record.settings.default_wall_thickness_ft = float(settings_dict.get("defaultWallThickness", 0.75))
        record.settings.roof_type = str(settings_dict.get("roofType", "flat"))
        record.settings.roof_slope_deg = float(settings_dict.get("roofSlopeAngle", 0.0))
        record.settings.parapet_height_ft = float(settings_dict.get("parapetHeight", 3.25))
        record.settings.environment_preset = str(lighting_dict.get("environmentPreset", "daylight"))
        record.settings.sun_azimuth = float(lighting_dict.get("sunAzimuth", 135.0))
        record.settings.sun_elevation = float(lighting_dict.get("sunElevation", 55.0))
        record.settings.shadows_enabled = bool(lighting_dict.get("shadowsEnabled", True))
        record.settings.lighting_config = lighting_dict
        record.settings.cost_config = cost_cfg_dict

    # Rate Overrides
    db.query(RateOverrideRecord).filter(
        RateOverrideRecord.project_id == project_id
    ).delete()
    custom_rates = cost_cfg_dict.get("customRates", {}) or {}
    for rate_key, rate_val in custom_rates.items():
        if isinstance(rate_val, (int, float)) and rate_val > 0:
            db.add(
                RateOverrideRecord(
                    id=f"{project_id}::{rate_key}",
                    project_id=project_id,
                    rate_type="labour" if str(rate_key).startswith("lab-") else "material",
                    rate_key=str(rate_key),
                    custom_rate_inr=float(rate_val),
                )
            )

    # Estimation Assumptions
    if assumptions:
        if record.assumptions is None:
            record.assumptions = EstimationAssumptionsRecord(
                project_id=project_id,
                foundation_depth_ft=float(assumptions.get("foundationDepthFt", 5.0)),
                foundation_width_ft=float(assumptions.get("foundationWidthFt", 3.5)),
                soil_type=str(assumptions.get("soilType", "medium_clay_sand")),
                footing_steel_kg_per_cum=float(assumptions.get("footingSteelKgPerCuM", 95.0)),
                column_beam_steel_kg_per_cum=float(assumptions.get("columnBeamSteelKgPerCuM", 145.0)),
                slab_stair_steel_kg_per_cum=float(assumptions.get("slabStairSteelKgPerCuM", 90.0)),
                flooring_wastage_percent=float(assumptions.get("flooringWastagePercent", 7.0)),
                assumptions_json=assumptions,
            )
        else:
            record.assumptions.foundation_depth_ft = float(assumptions.get("foundationDepthFt", 5.0))
            record.assumptions.foundation_width_ft = float(assumptions.get("foundationWidthFt", 3.5))
            record.assumptions.soil_type = str(assumptions.get("soilType", "medium_clay_sand"))
            record.assumptions.assumptions_json = assumptions

    # Construction Estimate Snapshot
    if estimate_snapshot and isinstance(estimate_snapshot, dict):
        db.add(
            ConstructionEstimateRecord(
                id=f"est-{uuid.uuid4().hex[:12]}",
                project_id=project_id,
                finish_tier=str(estimate_snapshot.get("finishTier", "standard")),
                location=str(estimate_snapshot.get("location", record.location)),
                material_cost_inr=float(estimate_snapshot.get("materialCostINR", 0.0)),
                labour_cost_inr=float(estimate_snapshot.get("labourCostINR", 0.0)),
                equipment_cost_inr=float(estimate_snapshot.get("equipmentCostINR", 0.0)),
                subtotal_inr=float(estimate_snapshot.get("subtotalINR", 0.0)),
                overheads_inr=float(estimate_snapshot.get("overheadsINR", 0.0)),
                contingency_inr=float(estimate_snapshot.get("contingencyINR", 0.0)),
                final_estimated_cost_inr=float(estimate_snapshot.get("finalEstimatedCostINR", 0.0)),
                cost_per_sqft_inr=float(estimate_snapshot.get("costPerSqFtINR", 0.0)),
                applicable_taxes_inr=float(estimate_snapshot.get("applicableTaxesINR", 0.0)),
                total_with_taxes_inr=float(estimate_snapshot.get("totalWithTaxesINR", 0.0)),
                estimate_snapshot=estimate_snapshot,
            )
        )

    # Project Version Snapshot
    existing_ver = (
        db.query(ProjectVersionRecord)
        .filter(
            ProjectVersionRecord.project_id == project_id,
            ProjectVersionRecord.version_number == record.version,
        )
        .first()
    )
    if existing_ver is None:
        db.add(
            ProjectVersionRecord(
                id=f"{project_id}::v{record.version}",
                project_id=project_id,
                version_number=record.version,
                summary=summary or f"Revision v{record.version}",
                snapshot_payload=copy.deepcopy(canonical_payload),
                created_by=user_id,
            )
        )


# --- 1. Authentication Endpoints ---

@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(
    req: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    auth_rate_limiter.check_or_raise(f"register:{client_ip}")

    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    pwd_hash, algo = hash_password(req.password)
    user_id = f"usr-{uuid.uuid4().hex[:16]}"
    user = User(
        id=user_id,
        email=req.email,
        password_hash=pwd_hash,
        hash_algorithm=algo,
        is_active=True,
    )
    profile = UserProfile(
        id=f"prf-{uuid.uuid4().hex[:16]}",
        user_id=user_id,
        full_name=req.fullName.strip(),
        organization=req.organization.strip() if req.organization else None,
        preferred_unit=req.preferredUnit,
        default_city=req.defaultCity,
    )
    db.add(user)
    db.add(profile)
    db.commit()

    token = create_session_token(user.id, user.email)
    set_auth_cookie(response, token)

    return {
        "authenticated": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "fullName": profile.full_name,
            "organization": profile.organization,
            "preferredUnit": profile.preferred_unit,
            "defaultCity": profile.default_city,
        },
        "sessionToken": token,
    }


@router.post("/auth/login")
def login_user(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    email_clean = req.email.strip().lower()
    auth_rate_limiter.check_or_raise(f"login:{client_ip}:{email_clean}")

    user = db.query(User).filter(User.email == email_clean, User.is_active.is_(True)).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
        )

    token = create_session_token(user.id, user.email)
    set_auth_cookie(response, token)

    profile = user.profile
    return {
        "authenticated": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "fullName": profile.full_name if profile else user.email.split("@")[0],
            "organization": profile.organization if profile else None,
            "preferredUnit": profile.preferred_unit if profile else "ft",
            "defaultCity": profile.default_city if profile else "Bengaluru, Karnataka",
        },
        "sessionToken": token,
    }


@router.post("/auth/logout")
def logout_user(response: Response):
    clear_auth_cookie(response)
    return {"authenticated": False, "message": "Signed out of HMX Home Studio."}


@router.get("/auth/me")
def get_authenticated_session(
    user: User = Depends(get_current_user),
):
    profile = user.profile
    return {
        "authenticated": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "fullName": profile.full_name if profile else user.email.split("@")[0],
            "organization": profile.organization if profile else None,
            "preferredUnit": profile.preferred_unit if profile else "ft",
            "defaultCity": profile.default_city if profile else "Bengaluru, Karnataka",
        },
    }


# --- 2. Persistent Project CRUD, Concurrency & Versioning Endpoints ---

@router.get("/projects")
def list_user_projects(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(HomeStudioProjectRecord)
        .filter(
            HomeStudioProjectRecord.owner_id == user.id,
            HomeStudioProjectRecord.is_archived.is_(False),
        )
        .order_by(HomeStudioProjectRecord.updated_at.desc())
        .all()
    )
    projects = []
    for rec in records:
        if rec.project_data and rec.project_data.canonical_payload:
            projects.append(rec.project_data.canonical_payload)
    return {"projects": projects, "count": len(projects)}


@router.post("/projects", status_code=status.HTTP_201_CREATED)
def create_user_project(
    req: SaveProjectRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = copy.deepcopy(req.project)
    _validate_building_project_payload(payload)

    proj_id = str(payload.get("id") or f"proj-{uuid.uuid4().hex[:12]}")
    existing = db.query(HomeStudioProjectRecord).filter(HomeStudioProjectRecord.id == proj_id).first()
    if existing:
        if existing.owner_id != user.id:
            # Generate a fresh unique project ID for this user so no cross-user collision occurs
            proj_id = f"{proj_id}-{uuid.uuid4().hex[:6]}"
            payload["id"] = proj_id
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Project with this ID already exists in your workspace. Use PUT to update.",
            )

    plot = payload.get("plot", {})
    record = HomeStudioProjectRecord(
        id=proj_id,
        owner_id=user.id,
        name=str(payload.get("name", "Untitled Residence")),
        description=str(payload.get("description", "")),
        location=str(payload.get("location", "Bengaluru, Karnataka")),
        schema_version=int(payload.get("schemaVersion", 1)),
        version=1,
        plot_width_ft=float(plot.get("width", 40.0)),
        plot_length_ft=float(plot.get("length", 60.0)),
        floor_count=len(payload.get("floors", [])),
        built_up_area_sqft=_compute_built_up_area_sqft(payload),
    )
    db.add(record)
    db.flush()

    _sync_project_relational_entities(
        db=db,
        record=record,
        canonical_payload=payload,
        user_id=user.id,
        summary=req.changeSummary or "Initial project creation",
        assumptions=req.assumptions,
        estimate_snapshot=req.estimateSnapshot,
    )
    db.commit()

    return {
        "project": record.project_data.canonical_payload,
        "version": record.version,
        "savedAt": record.updated_at.isoformat(),
    }


@router.get("/projects/{project_id}")
def get_user_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = verify_project_ownership(project_id, user, db)
    return {
        "project": record.project_data.canonical_payload if record.project_data else None,
        "version": record.version,
        "savedAt": record.updated_at.isoformat(),
    }


@router.put("/projects/{project_id}")
def update_user_project(
    project_id: str,
    req: SaveProjectRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = verify_project_ownership(project_id, user, db)
    payload = copy.deepcopy(req.project)
    payload["id"] = project_id
    _validate_building_project_payload(payload)

    # Optimistic concurrency conflict check
    if req.expectedVersion is not None and req.expectedVersion < record.version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Concurrent edit conflict detected: a newer version of this project exists on the server.",
                "serverVersion": record.version,
                "expectedVersion": req.expectedVersion,
            },
        )

    record.name = str(payload.get("name", record.name))
    record.description = str(payload.get("description", record.description))
    record.location = str(payload.get("location", record.location))
    plot = payload.get("plot", {})
    record.plot_width_ft = float(plot.get("width", record.plot_width_ft))
    record.plot_length_ft = float(plot.get("length", record.plot_length_ft))
    record.floor_count = len(payload.get("floors", []))
    record.built_up_area_sqft = _compute_built_up_area_sqft(payload)
    record.version = record.version + 1
    record.updated_at = utc_now()

    _sync_project_relational_entities(
        db=db,
        record=record,
        canonical_payload=payload,
        user_id=user.id,
        summary=req.changeSummary or f"Saved revision v{record.version}",
        assumptions=req.assumptions,
        estimate_snapshot=req.estimateSnapshot,
    )
    db.commit()

    return {
        "project": record.project_data.canonical_payload,
        "version": record.version,
        "savedAt": record.updated_at.isoformat(),
    }


@router.delete("/projects/{project_id}")
def delete_user_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = verify_project_ownership(project_id, user, db)
    db.delete(record)
    db.commit()
    return {"deleted": True, "projectId": project_id}


@router.post("/projects/{project_id}/duplicate", status_code=status.HTTP_201_CREATED)
def duplicate_user_project(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = verify_project_ownership(project_id, user, db)
    if not source.project_data:
        raise HTTPException(status_code=404, detail="Source project payload missing.")

    cloned = copy.deepcopy(source.project_data.canonical_payload)
    new_id = f"{project_id}-copy-{uuid.uuid4().hex[:6]}"
    cloned["id"] = new_id
    cloned["name"] = f"{source.name} (Copy)"
    cloned["version"] = 1

    new_rec = HomeStudioProjectRecord(
        id=new_id,
        owner_id=user.id,
        name=cloned["name"],
        description=source.description,
        location=source.location,
        schema_version=source.schema_version,
        version=1,
        plot_width_ft=source.plot_width_ft,
        plot_length_ft=source.plot_length_ft,
        floor_count=source.floor_count,
        built_up_area_sqft=source.built_up_area_sqft,
    )
    db.add(new_rec)
    db.flush()

    _sync_project_relational_entities(
        db=db,
        record=new_rec,
        canonical_payload=cloned,
        user_id=user.id,
        summary=f"Duplicated from {source.name}",
    )
    db.commit()

    return {
        "project": new_rec.project_data.canonical_payload,
        "version": new_rec.version,
        "savedAt": new_rec.updated_at.isoformat(),
    }


@router.get("/projects/{project_id}/versions")
def list_project_versions(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_ownership(project_id, user, db)
    versions = (
        db.query(ProjectVersionRecord)
        .filter(ProjectVersionRecord.project_id == project_id)
        .order_by(ProjectVersionRecord.version_number.desc())
        .all()
    )
    return {
        "projectId": project_id,
        "versions": [
            {
                "versionNumber": v.version_number,
                "summary": v.summary,
                "createdBy": v.created_by,
                "createdAt": v.created_at.isoformat(),
            }
            for v in versions
        ],
    }


@router.post("/projects/{project_id}/versions/{version_number}/restore")
def restore_project_version(
    project_id: str,
    version_number: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = verify_project_ownership(project_id, user, db)
    target = (
        db.query(ProjectVersionRecord)
        .filter(
            ProjectVersionRecord.project_id == project_id,
            ProjectVersionRecord.version_number == version_number,
        )
        .first()
    )
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version v{version_number} was not found for this project.",
        )

    restored_payload = copy.deepcopy(target.snapshot_payload)
    record.version = record.version + 1
    record.updated_at = utc_now()

    _sync_project_relational_entities(
        db=db,
        record=record,
        canonical_payload=restored_payload,
        user_id=user.id,
        summary=f"Restored from revision v{version_number}",
    )
    db.commit()

    return {
        "project": record.project_data.canonical_payload,
        "version": record.version,
        "restoredFromVersion": version_number,
        "savedAt": record.updated_at.isoformat(),
    }


@router.post("/projects/import-local")
def import_local_projects(
    req: ImportLocalProjectsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    imported_ids: List[str] = []
    skipped_ids: List[str] = []
    errors: List[str] = []

    for idx, raw_proj in enumerate(req.projects):
        try:
            _validate_building_project_payload(raw_proj)
            proj_id = str(raw_proj.get("id", f"proj-import-{uuid.uuid4().hex[:8]}"))
            existing = (
                db.query(HomeStudioProjectRecord)
                .filter(
                    HomeStudioProjectRecord.id == proj_id,
                    HomeStudioProjectRecord.owner_id == user.id,
                )
                .first()
            )
            if existing:
                skipped_ids.append(proj_id)
                continue

            # Ensure globally unique ID if another user owns a starter template with same ID
            global_clash = (
                db.query(HomeStudioProjectRecord)
                .filter(HomeStudioProjectRecord.id == proj_id)
                .first()
            )
            if global_clash:
                proj_id = f"{proj_id}-{user.id[-6:]}"
                raw_proj = copy.deepcopy(raw_proj)
                raw_proj["id"] = proj_id

            plot = raw_proj.get("plot", {})
            rec = HomeStudioProjectRecord(
                id=proj_id,
                owner_id=user.id,
                name=str(raw_proj.get("name", "Imported Project")),
                description=str(raw_proj.get("description", "")),
                location=str(raw_proj.get("location", "Bengaluru, Karnataka")),
                schema_version=int(raw_proj.get("schemaVersion", 1)),
                version=int(raw_proj.get("version", 1)),
                plot_width_ft=float(plot.get("width", 40.0)),
                plot_length_ft=float(plot.get("length", 60.0)),
                floor_count=len(raw_proj.get("floors", [])),
                built_up_area_sqft=_compute_built_up_area_sqft(raw_proj),
            )
            db.add(rec)
            db.flush()
            _sync_project_relational_entities(
                db=db,
                record=rec,
                canonical_payload=raw_proj,
                user_id=user.id,
                summary="Imported from local browser workspace",
            )
            imported_ids.append(proj_id)
        except HTTPException as he:
            errors.append(f"Project [{idx}]: {he.detail}")
        except Exception as exc:
            errors.append(f"Project [{idx}]: {str(exc)}")

    db.commit()
    return {
        "importedIds": imported_ids,
        "skippedIds": skipped_ids,
        "errors": errors,
    }


# --- 3. Report Metadata Persistence (Phase 9 & 10) ---

@router.post("/projects/{project_id}/reports", status_code=status.HTTP_201_CREATED)
def record_generated_report(
    project_id: str,
    req: CreateReportMetadataRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_ownership(project_id, user, db)
    rep_id = f"rep-{uuid.uuid4().hex[:12]}"
    rec = ReportMetadataRecord(
        id=rep_id,
        project_id=project_id,
        owner_id=user.id,
        report_type=req.reportType,
        title=req.title,
        project_version=req.projectVersion,
        file_name=req.fileName,
        page_count=req.pageCount,
        summary_metrics=req.summaryMetrics,
    )
    db.add(rec)
    db.commit()
    return {
        "id": rec.id,
        "projectId": rec.project_id,
        "ownerId": rec.owner_id,
        "reportType": rec.report_type,
        "title": rec.title,
        "projectVersion": rec.project_version,
        "fileName": rec.file_name,
        "pageCount": rec.page_count,
        "summaryMetrics": rec.summary_metrics,
        "createdAt": rec.created_at.isoformat(),
    }


@router.get("/projects/{project_id}/reports")
def list_project_reports(
    project_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_project_ownership(project_id, user, db)
    reports = (
        db.query(ReportMetadataRecord)
        .filter(
            ReportMetadataRecord.project_id == project_id,
            ReportMetadataRecord.owner_id == user.id,
        )
        .order_by(ReportMetadataRecord.created_at.desc())
        .all()
    )
    return {
        "projectId": project_id,
        "reports": [
            {
                "id": r.id,
                "projectId": r.project_id,
                "ownerId": r.owner_id,
                "reportType": r.report_type,
                "title": r.title,
                "projectVersion": r.project_version,
                "fileName": r.file_name,
                "pageCount": r.page_count,
                "summaryMetrics": r.summary_metrics,
                "createdAt": r.created_at.isoformat(),
            }
            for r in reports
        ],
    }


@router.get("/health/db")
def home_studio_db_health():
    return check_database_health()


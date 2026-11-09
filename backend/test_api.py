"""
HMX Backend Unit & Integration Tests
Validates FastAPI endpoints, request validations, and ML model outputs based on Housing.csv.
"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert "metrics" in data
    assert data["metrics"]["r2_score"] > 0.5
    assert data["training_samples"] == 436


def test_predict_endpoint_valid():
    payload = {
        "area": 5400,
        "bedrooms": 3,
        "bathrooms": 2,
        "stories": 2,
        "parking": 2,
        "mainroad": True,
        "guestroom": False,
        "basement": True,
        "hotwaterheating": False,
        "airconditioning": True,
        "prefarea": True,
        "furnishingstatus": "semi-furnished",
        "currency": "INR",
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "predicted_price" in data
    assert data["predicted_price"] > 0
    assert "price_per_sqft" in data
    assert "lower_range" in data
    assert "upper_range" in data
    assert data["lower_range"] <= data["predicted_price"] <= data["upper_range"]
    assert "feature_impacts" in data
    assert len(data["feature_impacts"]) > 0
    assert "market_comparison" in data
    assert data["is_demo_model"] is False


def test_predict_validation_error():
    # Area <= 0 should fail validation
    payload = {
        "area": -50,
        "bedrooms": 2,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code in [422, 500]


def test_insights_endpoint():
    response = client.get("/insights")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "insights" in data
    assert "by_bedrooms" in data["insights"]
    assert "summary" in data["insights"]
    assert data["insights"]["summary"]["total_properties"] == 545


def test_analytics_endpoint():
    response = client.get("/analytics")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["online", "fallback"]
    assert "kpis" in data
    assert "model_comparison" in data
    assert len(data["model_comparison"]) >= 4
    assert "feature_importance" in data
    assert "correlations" in data
    assert "residual_analysis" in data
    assert data["kpis"]["dataset_size"] == 545
    assert data["kpis"]["num_features"] == 12


def test_home_studio_auth_and_idor_protection():
    import uuid
    suffix = uuid.uuid4().hex[:8]
    user1_email = f"architect1_{suffix}@hmx.studio"
    user2_email = f"architect2_{suffix}@hmx.studio"

    # 1. Register User 1
    reg1 = client.post(
        "/home-studio/auth/register",
        json={
            "email": user1_email,
            "password": "StrongPassword!234",
            "fullName": "Aarav Mehta",
            "organization": "HMX Atelier",
        },
    )
    assert reg1.status_code == 201
    token1 = reg1.json()["sessionToken"]

    # 2. Create project as User 1
    sample_project = {
        "id": f"proj-test-{suffix}",
        "name": "Malabar Hill Villa",
        "description": "Two-floor luxury residence",
        "location": "Mumbai, Maharashtra",
        "plot": {"width": 50, "length": 80, "shape": "rectangular"},
        "floors": [
            {
                "id": "flr-g",
                "name": "Ground Floor",
                "type": "ground",
                "levelIndex": 0,
                "elevation": 0,
                "floorHeight": 0.5,
                "ceilingHeight": 11,
                "visible": True,
                "locked": False,
                "rooms": [
                    {
                        "id": "rm-1",
                        "name": "Grand Salon",
                        "type": "living_room",
                        "dimensions": {"width": 20, "length": 25, "area": 500},
                        "polygon": [{"x": 5, "y": 5}, {"x": 25, "y": 5}, {"x": 25, "y": 30}, {"x": 5, "y": 30}],
                        "floorMaterialId": "mat-marble-carrara",
                        "wallMaterialId": "mat-paint-ivory",
                        "color": "#F4EFE6",
                    }
                ],
                "walls": [],
                "openings": [],
                "objects": [],
            }
        ],
        "materials": [],
        "settings": {"roofType": "flat", "lighting": {}, "costConfig": {}},
    }
    create_res = client.post(
        "/home-studio/projects",
        headers={"Authorization": f"Bearer {token1}"},
        json={"project": sample_project, "changeSummary": "Initial creation"},
    )
    assert create_res.status_code == 201
    created_id = create_res.json()["project"]["id"]

    # 3. Register User 2 and attempt IDOR access to User 1's project
    reg2 = client.post(
        "/home-studio/auth/register",
        json={
            "email": user2_email,
            "password": "StrongPassword!567",
            "fullName": "Riya Kapoor",
        },
    )
    assert reg2.status_code == 201
    token2 = reg2.json()["sessionToken"]

    idor_get = client.get(
        f"/home-studio/projects/{created_id}",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert idor_get.status_code == 403

    idor_delete = client.delete(
        f"/home-studio/projects/{created_id}",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert idor_delete.status_code == 403


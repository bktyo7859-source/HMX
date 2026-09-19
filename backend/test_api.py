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

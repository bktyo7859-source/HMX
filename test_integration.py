import urllib.request
import json
import sys

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

print("=" * 60)
print("HMX FULL SYSTEM INTEGRATION VERIFICATION (HOUSING.CSV PIPELINE)")
print("=" * 60)

# 1. Test Next.js Front-End Routes
print("\n--- 1. Testing Next.js Frontend Routes ---")
frontend_routes = ["/", "/properties", "/predict", "/insights", "/about"]
for route in frontend_routes:
    try:
        url = f"http://localhost:3000{route}"
        res = urllib.request.urlopen(url)
        content = res.read()
        print(f"  [OK] Route {route:15} : Status {res.status} OK ({len(content):,} bytes rendered)")
    except Exception as e:
        print(f"  [SKIP/ERR] Route {route:15} : {e}")

# 2. Test FastAPI Backend Endpoints
print("\n--- 2. Testing FastAPI Backend Endpoints ---")
try:
    health_res = urllib.request.urlopen("http://127.0.0.1:8000/health")
    health_data = json.loads(health_res.read().decode("utf-8"))
    print(f"  [OK] /health endpoint  : Status {health_res.status} OK")
    print(f"       - Model Loaded    : {health_data.get('model_loaded')}")
    print(f"       - Model Type      : {health_data.get('model_type')}")
    print(f"       - Dataset         : {health_data.get('dataset')}")
    print(f"       - Training Samples: {health_data.get('training_samples'):,}")
    print(f"       - R2 Score        : {health_data.get('metrics', {}).get('r2_score')}")
    print(f"       - MAE             : INR {health_data.get('metrics', {}).get('mae'):,}")
    print(f"       - RMSE            : INR {health_data.get('metrics', {}).get('rmse'):,}")
except Exception as e:
    print(f"  [ERR] /health failed: {e}")

# 3. Test Machine Learning Prediction Pipeline
print("\n--- 3. Testing Gradient Boosting Valuation Pipeline (/predict) ---")
payload = {
    "area": 3240,
    "bedrooms": 4,
    "bathrooms": 3,
    "stories": 2,
    "parking": 2,
    "mainroad": True,
    "guestroom": True,
    "basement": True,
    "hotwaterheating": False,
    "airconditioning": True,
    "prefarea": True,
    "furnishingstatus": "furnished",
    "currency": "INR",
}

try:
    req = urllib.request.Request(
        "http://127.0.0.1:8000/predict",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    pred_res = urllib.request.urlopen(req)
    pred_data = json.loads(pred_res.read().decode("utf-8"))
    print(f"  [OK] /predict endpoint : Status {pred_res.status} OK")
    print(f"       - Predicted Price : INR {pred_data['predicted_price']:,}")
    print(f"       - Quantile Range  : INR {pred_data['lower_range']:,} - INR {pred_data['upper_range']:,}")
    print(f"       - Price per sq ft : INR {pred_data['price_per_sqft']:,} / sq ft")
    print(f"       - Model Status    : {pred_data['model_name']}")
    print(f"       - Reliability     : {pred_data['reliability']} Reliability ({pred_data.get('uncertainty_percentage')}% spread)")
    print(f"       - Feature Impacts : {len(pred_data['feature_impacts'])} drivers evaluated")
    for f in pred_data['feature_impacts']:
        print(f"         * {f['feature']:28}: {f['percentage']}% ({f['impact']})")
    print(f"       - Benchmark Points: {len(pred_data['market_comparison']['comparison_points'])} comparison tiers")
except Exception as e:
    print(f"  [ERR] /predict failed: {e}")

# 4. Test Market Insights Endpoint
print("\n--- 4. Testing Market Insights Endpoint (/insights) ---")
try:
    ins_res = urllib.request.urlopen("http://127.0.0.1:8000/insights")
    ins_data = json.loads(ins_res.read().decode("utf-8"))
    print(f"  [OK] /insights endpoint: Status {ins_res.status} OK")
    print(f"       - Dataset Verified: {ins_data.get('dataset_name')}")
    summary = ins_data.get('insights', {}).get('summary', {})
    print(f"       - Total Properties: {summary.get('total_properties')}")
    print(f"       - Mean Price      : INR {summary.get('avg_price'):,.2f}")
    print(f"       - Median Price    : INR {summary.get('median_price'):,.2f}")
except Exception as e:
    print(f"  [ERR] /insights failed: {e}")

print("\n" + "=" * 60)
print("ALL SYSTEM INTEGRATION CHECKS COMPLETED!")
print("=" * 60)

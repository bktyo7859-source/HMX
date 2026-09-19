"""
HMX House Price Prediction — Model Training Script
Trains a Gradient Boosting Regression model with Quantile Prediction Intervals
on the real Kaggle Housing Prices Dataset (Housing.csv, N=545).
Computes evaluation metrics (MAE, RMSE, R2), dataset analytics, and saves the pipeline to backend/hmx_model.joblib.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# Set random seed for reproducibility
np.random.seed(42)


def load_and_preprocess_dataset(csv_path: str = None) -> pd.DataFrame:
    """
    Loads and validates the real Kaggle Housing.csv dataset.
    """
    if csv_path is None:
        root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Housing.csv"))
        backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "Housing.csv"))
        csv_path = root_path if os.path.exists(root_path) else backend_path

    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Housing.csv not found at {csv_path}")

    df = pd.read_csv(csv_path)
    print(f"Loaded Kaggle Housing Dataset from {csv_path} with shape: {df.shape}")
    return df


def compute_dataset_insights(df: pd.DataFrame) -> dict:
    """
    Computes genuine aggregations from Housing.csv for market insights and benchmarks.
    """
    avg_price = float(df["price"].mean())
    median_price = float(df["price"].median())
    min_price = float(df["price"].min())
    max_price = float(df["price"].max())

    # Price by bedrooms
    by_bedrooms = (
        df.groupby("bedrooms")["price"]
        .agg(avg_price="mean", count="count")
        .reset_index()
        .to_dict(orient="records")
    )

    # Price by bathrooms
    by_bathrooms = (
        df.groupby("bathrooms")["price"]
        .agg(avg_price="mean", count="count")
        .reset_index()
        .to_dict(orient="records")
    )

    # Price by stories
    by_stories = (
        df.groupby("stories")["price"]
        .agg(avg_price="mean", count="count")
        .reset_index()
        .to_dict(orient="records")
    )

    # Price by furnishing status
    by_furnishing = (
        df.groupby("furnishingstatus")["price"]
        .agg(avg_price="mean", count="count")
        .reset_index()
        .to_dict(orient="records")
    )

    # Price by air conditioning
    by_ac = (
        df.groupby("airconditioning")["price"]
        .agg(avg_price="mean", count="count")
        .reset_index()
        .to_dict(orient="records")
    )

    # Price by preferred area
    by_prefarea = (
        df.groupby("prefarea")["price"]
        .agg(avg_price="mean", count="count")
        .reset_index()
        .to_dict(orient="records")
    )

    # Price by parking spaces
    by_parking = (
        df.groupby("parking")["price"]
        .agg(avg_price="mean", count="count")
        .reset_index()
        .to_dict(orient="records")
    )

    # Price distribution histogram bins (6 equal width bins)
    hist, bin_edges = np.histogram(df["price"], bins=6)
    price_distribution = []
    for i in range(len(hist)):
        bin_label = f"₹{int(bin_edges[i]/100000):,}L - ₹{int(bin_edges[i+1]/100000):,}L"
        price_distribution.append({
            "range": bin_label,
            "min": float(bin_edges[i]),
            "max": float(bin_edges[i+1]),
            "count": int(hist[i]),
            "percentage": round(float(hist[i] / len(df)) * 100, 1),
        })

    # Quartiles for benchmarking
    q25 = float(df["price"].quantile(0.25))
    q50 = float(df["price"].quantile(0.50))
    q75 = float(df["price"].quantile(0.75))
    avg_price_per_sqft = float((df["price"] / df["area"]).mean())

    return {
        "summary": {
            "total_properties": len(df),
            "avg_price": round(avg_price, 2),
            "median_price": round(median_price, 2),
            "min_price": round(min_price, 2),
            "max_price": round(max_price, 2),
            "avg_price_per_sqft": round(avg_price_per_sqft, 2),
            "q25_price": round(q25, 2),
            "q50_price": round(q50, 2),
            "q75_price": round(q75, 2),
        },
        "by_bedrooms": by_bedrooms,
        "by_bathrooms": by_bathrooms,
        "by_stories": by_stories,
        "by_furnishing": by_furnishing,
        "by_airconditioning": by_ac,
        "by_prefarea": by_prefarea,
        "by_parking": by_parking,
        "price_distribution": price_distribution,
    }


def train_model():
    df = load_and_preprocess_dataset()

    X = df.drop(columns=["price"])
    y = df["price"]

    cat_cols = [
        "mainroad",
        "guestroom",
        "basement",
        "hotwaterheating",
        "airconditioning",
        "prefarea",
        "furnishingstatus",
    ]
    num_cols = ["area", "bedrooms", "bathrooms", "stories", "parking"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_cols),
            ("cat", OneHotEncoder(drop="first", sparse_output=False), cat_cols),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    print(f"Training split: {len(X_train)} samples | Test split: {len(X_test)} samples")

    # 1. Primary Point Prediction Model (Gradient Boosting Regressor)
    point_model = GradientBoostingRegressor(
        n_estimators=120,
        learning_rate=0.05,
        max_depth=3,
        subsample=0.85,
        random_state=42,
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", point_model),
    ])

    print("Fitting Primary Gradient Boosting Valuation Pipeline...")
    pipeline.fit(X_train, y_train)

    # 2. Lower Bound Quantile Regressor (10th Percentile)
    lower_model = GradientBoostingRegressor(
        loss="quantile",
        alpha=0.10,
        n_estimators=120,
        learning_rate=0.05,
        max_depth=3,
        subsample=0.85,
        random_state=42,
    )
    lower_pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", lower_model),
    ])
    print("Fitting Lower-Bound Quantile Estimator (alpha=0.10)...")
    lower_pipeline.fit(X_train, y_train)

    # 3. Upper Bound Quantile Regressor (90th Percentile)
    upper_model = GradientBoostingRegressor(
        loss="quantile",
        alpha=0.90,
        n_estimators=120,
        learning_rate=0.05,
        max_depth=3,
        subsample=0.85,
        random_state=42,
    )
    upper_pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", upper_model),
    ])
    print("Fitting Upper-Bound Quantile Estimator (alpha=0.90)...")
    upper_pipeline.fit(X_train, y_train)

    # Predictions & evaluation on Test Partition
    y_pred_test = pipeline.predict(X_test)
    y_pred_train = pipeline.predict(X_train)

    test_mae = float(mean_absolute_error(y_test, y_pred_test))
    test_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_test)))
    test_r2 = float(r2_score(y_test, y_pred_test))

    train_mae = float(mean_absolute_error(y_train, y_pred_train))
    train_r2 = float(r2_score(y_train, y_pred_train))

    print("\n" + "=" * 55)
    print("KAGGLE HOUSING DATASET — MODEL EVALUATION RESULTS")
    print("=" * 55)
    print(f"Dataset Size:     {len(df)} rows, {df.shape[1]} columns")
    print(f"Train Samples:    {len(X_train)} rows")
    print(f"Test Samples:     {len(X_test)} rows")
    print(f"Train R² Score:   {train_r2:.4f}")
    print(f"Test R² Score:    {test_r2:.4f}")
    print(f"Test MAE:         INR {test_mae:,.2f}")
    print(f"Test RMSE:        INR {test_rmse:,.2f}")
    print("=" * 55)

    # Extract Feature Importances directly from the trained GradientBoostingRegressor
    cat_names = list(
        pipeline.named_steps["preprocessor"]
        .named_transformers_["cat"]
        .get_feature_names_out(cat_cols)
    )
    all_feature_names = num_cols + cat_names
    importances = pipeline.named_steps["regressor"].feature_importances_
    raw_importance = dict(zip(all_feature_names, [float(v) for v in importances]))

    # Grouped importance for explainability UI (purely based on model weights)
    grouped_importance = {
        "Property Living Area (sq ft)": float(raw_importance.get("area", 0)),
        "Bathrooms & Plumbing": float(raw_importance.get("bathrooms", 0)),
        "Air Conditioning Climate": float(raw_importance.get("airconditioning_yes", 0)),
        "Floors & Stories": float(raw_importance.get("stories", 0)),
        "Parking Spaces": float(raw_importance.get("parking", 0)),
        "Preferred Area Location": float(raw_importance.get("prefarea_yes", 0)),
        "Bedrooms & Layout": float(raw_importance.get("bedrooms", 0)),
        "Basement Structure": float(raw_importance.get("basement_yes", 0)),
        "Furnishing Quality": float(
            raw_importance.get("furnishingstatus_semi-furnished", 0)
            + raw_importance.get("furnishingstatus_unfurnished", 0)
        ),
        "Main Road Accessibility": float(raw_importance.get("mainroad_yes", 0)),
        "Hot Water Heating": float(raw_importance.get("hotwaterheating_yes", 0)),
        "Guest Room Accommodation": float(raw_importance.get("guestroom_yes", 0)),
    }

    # Normalize grouped importance to 100%
    total_group = sum(grouped_importance.values())
    grouped_importance = {k: round((v / total_group) * 100, 1) for k, v in grouped_importance.items()}

    # Compute genuine dataset insights
    dataset_insights = compute_dataset_insights(df)

    artifact = {
        "pipeline": pipeline,
        "lower_pipeline": lower_pipeline,
        "upper_pipeline": upper_pipeline,
        "metrics": {
            "mae": round(test_mae, 2),
            "rmse": round(test_rmse, 2),
            "r2_score": round(test_r2, 4),
            "train_mae": round(train_mae, 2),
            "train_r2_score": round(train_r2, 4),
        },
        "grouped_importance": grouped_importance,
        "raw_importance": raw_importance,
        "feature_names": all_feature_names,
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "dataset_insights": dataset_insights,
        "dataset_info": {
            "name": "Kaggle Housing Prices Dataset",
            "filename": "Housing.csv",
            "rows": len(df),
            "columns": df.shape[1],
            "target": "price",
            "source": "Kaggle Real Estate Public Dataset",
            "license": "Open Data / CC0 Public Domain",
            "features": num_cols + cat_cols,
        },
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "total_samples": len(df),
        "model_type": "Gradient Boosting Regressor with Quantile Prediction Intervals",
        "framework": "Scikit-Learn",
        "version": "2.0.0-housing",
    }

    output_path = os.path.join(os.path.dirname(__file__), "hmx_model.joblib")
    joblib.dump(artifact, output_path)
    print(f"Production model successfully saved to {output_path}!\n")


if __name__ == "__main__":
    train_model()

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
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, mean_absolute_percentage_error
from sklearn.model_selection import train_test_split, cross_val_score, KFold
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
    price_sqft_series = df["price"] / df["area"]
    avg_price_per_sqft = float(price_sqft_series.mean())
    median_price_per_sqft = float(price_sqft_series.median())
    min_price_per_sqft = float(price_sqft_series.min())
    max_price_per_sqft = float(price_sqft_series.max())
    avg_area = float(df["area"].mean())
    median_area = float(df["area"].median())
    min_area = float(df["area"].min())
    max_area = float(df["area"].max())

    # Area distribution histogram bins (6 equal width bins)
    hist_area, area_bin_edges = np.histogram(df["area"], bins=6)
    area_distribution = []
    for i in range(len(hist_area)):
        area_distribution.append({
            "range": f"{int(area_bin_edges[i]):,} - {int(area_bin_edges[i+1]):,} sq ft",
            "min": float(area_bin_edges[i]),
            "max": float(area_bin_edges[i+1]),
            "count": int(hist_area[i]),
            "percentage": round(float(hist_area[i] / len(df)) * 100, 1),
        })

    # Location Analytics (Preferred Area vs Standard Area)
    pref_df = df[df["prefarea"] == "yes"]
    non_pref_df = df[df["prefarea"] == "no"]

    location_analytics = [
        {
            "location": "Preferred Area (Prime)",
            "prefarea": "yes",
            "count": int(len(pref_df)),
            "percentage": round(float(len(pref_df) / len(df) * 100), 1),
            "avg_price": round(float(pref_df["price"].mean()), 2),
            "median_price": round(float(pref_df["price"].median()), 2),
            "min_price": round(float(pref_df["price"].min()), 2),
            "max_price": round(float(pref_df["price"].max()), 2),
            "avg_price_per_sqft": round(float((pref_df["price"] / pref_df["area"]).mean()), 2),
            "median_price_per_sqft": round(float((pref_df["price"] / pref_df["area"]).median()), 2),
            "avg_area": round(float(pref_df["area"].mean()), 1),
        },
        {
            "location": "Standard Area (General)",
            "prefarea": "no",
            "count": int(len(non_pref_df)),
            "percentage": round(float(len(non_pref_df) / len(df) * 100), 1),
            "avg_price": round(float(non_pref_df["price"].mean()), 2),
            "median_price": round(float(non_pref_df["price"].median()), 2),
            "min_price": round(float(non_pref_df["price"].min()), 2),
            "max_price": round(float(non_pref_df["price"].max()), 2),
            "avg_price_per_sqft": round(float((non_pref_df["price"] / non_pref_df["area"]).mean()), 2),
            "median_price_per_sqft": round(float((non_pref_df["price"] / non_pref_df["area"]).median()), 2),
            "avg_area": round(float(non_pref_df["area"].mean()), 1),
        },
    ]

    price_per_sqft_stats = {
        "avg": round(avg_price_per_sqft, 2),
        "median": round(median_price_per_sqft, 2),
        "min": round(min_price_per_sqft, 2),
        "max": round(max_price_per_sqft, 2),
        "std": round(float(price_sqft_series.std()), 2),
        "q25": round(float(price_sqft_series.quantile(0.25)), 2),
        "q75": round(float(price_sqft_series.quantile(0.75)), 2),
    }

    return {
        "summary": {
            "total_properties": len(df),
            "avg_price": round(avg_price, 2),
            "median_price": round(median_price, 2),
            "min_price": round(min_price, 2),
            "max_price": round(max_price, 2),
            "avg_price_per_sqft": round(avg_price_per_sqft, 2),
            "median_price_per_sqft": round(median_price_per_sqft, 2),
            "min_price_per_sqft": round(min_price_per_sqft, 2),
            "max_price_per_sqft": round(max_price_per_sqft, 2),
            "avg_area": round(avg_area, 1),
            "median_area": round(median_area, 1),
            "min_area": round(min_area, 1),
            "max_area": round(max_area, 1),
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
        "area_distribution": area_distribution,
        "location_analytics": location_analytics,
        "price_per_sqft_stats": price_per_sqft_stats,
    }


def compute_correlations_and_drift_bounds(df: pd.DataFrame, num_cols: list, cat_cols: list) -> dict:
    """
    Computes Pearson correlation coefficients with house price and feature statistics for drift bounds.
    """
    df_corr = df.copy()
    for col in ['mainroad', 'guestroom', 'basement', 'hotwaterheating', 'airconditioning', 'prefarea']:
        df_corr[col] = (df_corr[col] == 'yes').astype(int)
    df_corr['furnishingstatus'] = df_corr['furnishingstatus'].map({'unfurnished': 0, 'semi-furnished': 1, 'furnished': 2})

    correlations = []
    corr_series = df_corr.corr()['price'].drop('price').sort_values(ascending=False)
    for feature_name, r_val in corr_series.items():
        correlations.append({
            "feature": feature_name,
            "correlation": round(float(r_val), 4),
            "direction": "positive" if r_val > 0 else "negative",
            "strength": "strong" if abs(r_val) >= 0.45 else ("moderate" if abs(r_val) >= 0.25 else "weak"),
        })

    # Feature distribution bounds (min, max, mean, std)
    drift_bounds = {}
    for col in num_cols:
        drift_bounds[col] = {
            "type": "numeric",
            "min": float(df[col].min()),
            "max": float(df[col].max()),
            "mean": round(float(df[col].mean()), 2),
            "std": round(float(df[col].std()), 2),
            "p25": float(df[col].quantile(0.25)),
            "p75": float(df[col].quantile(0.75)),
        }
    for col in cat_cols:
        counts = df[col].value_counts(normalize=True).to_dict()
        drift_bounds[col] = {
            "type": "categorical",
            "categories": [str(k) for k in counts.keys()],
            "proportions": {str(k): round(float(v), 3) for k, v in counts.items()},
        }

    return {"correlations": correlations, "drift_bounds": drift_bounds}


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

    # 1. Primary Point Prediction Model (Gradient Boosting Regressor - Active)
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

    # Primary Model Predictions & Evaluation
    y_pred_test = pipeline.predict(X_test)
    y_pred_train = pipeline.predict(X_train)

    test_mae = float(mean_absolute_error(y_test, y_pred_test))
    test_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_test)))
    test_r2 = float(r2_score(y_test, y_pred_test))
    test_mape = float(mean_absolute_percentage_error(y_test, y_pred_test) * 100)

    train_mae = float(mean_absolute_error(y_train, y_pred_train))
    train_rmse = float(np.sqrt(mean_squared_error(y_train, y_pred_train)))
    train_r2 = float(r2_score(y_train, y_pred_train))
    train_mape = float(mean_absolute_percentage_error(y_train, y_pred_train) * 100)

    # 5-Fold Cross Validation for primary model
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X, y, cv=kf, scoring="r2")
    cv_mean = float(cv_scores.mean())
    cv_std = float(cv_scores.std())

    # Residual Analysis & Error Diagnostics
    residuals = y_test.values - y_pred_test
    abs_pct_errors = (np.abs(residuals) / y_test.values) * 100

    within_10_pct = float(np.mean(abs_pct_errors <= 10) * 100)
    within_20_pct = float(np.mean(abs_pct_errors <= 20) * 100)
    within_30_pct = float(np.mean(abs_pct_errors <= 30) * 100)

    hist_counts, bin_edges = np.histogram(residuals / 100000, bins=7)
    residual_distribution = []
    for i in range(len(hist_counts)):
        residual_distribution.append({
            "bin": f"₹{bin_edges[i]:.1f}L to ₹{bin_edges[i+1]:.1f}L",
            "min_error": round(float(bin_edges[i] * 100000), 2),
            "max_error": round(float(bin_edges[i+1] * 100000), 2),
            "count": int(hist_counts[i]),
            "percentage": round(float(hist_counts[i] / len(y_test)) * 100, 1),
        })

    # Sample all actual vs predicted points on held-out test split (109 samples)
    actual_vs_predicted = []
    for i, (actual, pred) in enumerate(zip(y_test.values, y_pred_test)):
        actual_vs_predicted.append({
            "index": i + 1,
            "actual": round(float(actual), 2),
            "predicted": round(float(pred), 2),
            "residual": round(float(actual - pred), 2),
            "abs_error": round(float(abs(actual - pred)), 2),
            "pct_error": round(float(abs(actual - pred) / actual * 100), 1),
        })

    # Summary Error Diagnostics
    error_diagnostics = {
        "mean_error": round(float(np.mean(residuals)), 2),
        "median_error": round(float(np.median(residuals)), 2),
        "max_error": round(float(np.max(np.abs(residuals))), 2),
        "mae": round(test_mae, 2),
        "rmse": round(test_rmse, 2),
        "mape": round(test_mape, 2),
        "underpredicted_count": int(np.sum(residuals > 0)),
        "underpredicted_pct": round(float(np.mean(residuals > 0) * 100), 1),
        "overpredicted_count": int(np.sum(residuals < 0)),
        "overpredicted_pct": round(float(np.mean(residuals < 0) * 100), 1),
        "within_10_pct": round(within_10_pct, 1),
        "within_20_pct": round(within_20_pct, 1),
        "within_30_pct": round(within_30_pct, 1),
    }

    # Benchmark Multiple Real ML Algorithms on exact same dataset split
    benchmark_candidates = {
        "Gradient Boosting (Active)": {
            "model": point_model,
            "description": "Ensemble of shallow decision trees optimized via gradient descent on pseudo-residuals.",
            "is_active": True,
        },
        "Random Forest Regressor": {
            "model": RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42),
            "description": "Bagging ensemble of 100 randomized decision trees with variance reduction.",
            "is_active": False,
        },
        "Ridge Regression (L2)": {
            "model": Ridge(alpha=1.0),
            "description": "Regularized linear model with Tikhonov L2 penalty to suppress collinearity.",
            "is_active": False,
        },
        "Linear Regression (OLS)": {
            "model": LinearRegression(),
            "description": "Standard Ordinary Least Squares linear regression baseline.",
            "is_active": False,
        },
        "Decision Tree Regressor": {
            "model": DecisionTreeRegressor(max_depth=5, random_state=42),
            "description": "Single CART decision tree partitioning feature space up to max depth 5.",
            "is_active": False,
        },
    }

    model_comparison = []
    for model_name, info in benchmark_candidates.items():
        candidate_pipe = Pipeline([
            ("preprocessor", preprocessor),
            ("regressor", info["model"]),
        ])
        candidate_pipe.fit(X_train, y_train)
        c_pred_test = candidate_pipe.predict(X_test)
        c_pred_train = candidate_pipe.predict(X_train)
        c_cv = cross_val_score(candidate_pipe, X, y, cv=kf, scoring="r2")

        model_comparison.append({
            "model_name": model_name,
            "algorithm": info["model"].__class__.__name__,
            "description": info["description"],
            "is_active": info["is_active"],
            "test_r2": round(float(r2_score(y_test, c_pred_test)), 4),
            "test_mae": round(float(mean_absolute_error(y_test, c_pred_test)), 2),
            "test_rmse": round(float(np.sqrt(mean_squared_error(y_test, c_pred_test))), 2),
            "test_mape": round(float(mean_absolute_percentage_error(y_test, c_pred_test) * 100), 2),
            "train_r2": round(float(r2_score(y_train, c_pred_train)), 4),
            "cv_r2_mean": round(float(c_cv.mean()), 4),
            "cv_r2_std": round(float(c_cv.std()), 4),
        })

    print("\n" + "=" * 65)
    print("KAGGLE HOUSING DATASET -- AUTHENTIC BENCHMARK EVALUATION")
    print("=" * 65)
    for res in model_comparison:
        print(f"{res['model_name']:<28} | R2: {res['test_r2']:.4f} | MAE: INR {res['test_mae']:,.0f} | MAPE: {res['test_mape']:.2f}% | CV: {res['cv_r2_mean']:.4f}")
    print("=" * 65)

    # Extract Feature Importances directly from the trained GradientBoostingRegressor
    cat_names = list(
        pipeline.named_steps["preprocessor"]
        .named_transformers_["cat"]
        .get_feature_names_out(cat_cols)
    )
    all_feature_names = num_cols + cat_names
    importances = pipeline.named_steps["regressor"].feature_importances_
    raw_importance = dict(zip(all_feature_names, [round(float(v), 5) for v in importances]))

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

    # Sorted feature importance list for frontend horizontal bar chart
    sorted_feature_importance = [
        {"feature": k, "importance_percentage": v, "raw_weight": round(v / 100.0, 4)}
        for k, v in sorted(grouped_importance.items(), key=lambda x: x[1], reverse=True)
    ]

    # Compute genuine dataset insights and correlations
    dataset_insights = compute_dataset_insights(df)
    corr_drift = compute_correlations_and_drift_bounds(df, num_cols, cat_cols)

    artifact = {
        "pipeline": pipeline,
        "lower_pipeline": lower_pipeline,
        "upper_pipeline": upper_pipeline,
        "metrics": {
            "mae": round(test_mae, 2),
            "rmse": round(test_rmse, 2),
            "r2_score": round(test_r2, 4),
            "mape": round(test_mape, 2),
            "train_mae": round(train_mae, 2),
            "train_rmse": round(train_rmse, 2),
            "train_r2_score": round(train_r2, 4),
            "train_mape": round(train_mape, 2),
            "cv_r2_mean": round(cv_mean, 4),
            "cv_r2_std": round(cv_std, 4),
            "cv_scores": [round(float(s), 4) for s in cv_scores],
            "within_10_pct": round(within_10_pct, 1),
            "within_20_pct": round(within_20_pct, 1),
            "within_30_pct": round(within_30_pct, 1),
        },
        "model_comparison": model_comparison,
        "residual_distribution": residual_distribution,
        "actual_vs_predicted": actual_vs_predicted,
        "error_diagnostics": error_diagnostics,
        "grouped_importance": grouped_importance,
        "sorted_feature_importance": sorted_feature_importance,
        "raw_importance": raw_importance,
        "feature_names": all_feature_names,
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "dataset_insights": dataset_insights,
        "dataset_records": df.to_dict(orient="records"),
        "correlations": corr_drift["correlations"],
        "drift_bounds": corr_drift["drift_bounds"],
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
        "active_algorithm": "GradientBoostingRegressor",
        "hyperparameters": {
            "n_estimators": 120,
            "learning_rate": 0.05,
            "max_depth": 3,
            "subsample": 0.85,
            "random_state": 42,
            "lower_quantile_alpha": 0.10,
            "upper_quantile_alpha": 0.90,
        },
        "framework": "Scikit-Learn",
        "version": "2.0.0-housing",
        "trained_at": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
    }

    output_path = os.path.join(os.path.dirname(__file__), "hmx_model.joblib")
    joblib.dump(artifact, output_path)
    print(f"\nProduction model & ML Analytics artifact successfully saved to {output_path}!\n")


if __name__ == "__main__":
    train_model()


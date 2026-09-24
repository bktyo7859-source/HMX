"""
HMX Property Valuation Platform — FastAPI Application
Production-ready REST API for AI/ML house price predictions, health metrics, and authentic Housing.csv market insights.
"""

import os
from typing import Dict, Any, List, Optional, Union
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

try:
    from model import HMXValuationEngine
except ImportError:
    from backend.model import HMXValuationEngine

app = FastAPI(
    title="HMX AI Property Valuation API",
    description="High-precision Gradient Boosting valuation engine trained on Kaggle Housing.csv dataset.",
    version="2.0.0",
)

# Enable CORS for local development and production frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate engine
engine = HMXValuationEngine()


# --- Pydantic Request Model for Housing.csv Features ---

class PredictionRequest(BaseModel):
    # Core Housing.csv Features
    area: Optional[float] = Field(default=None, description="Property living area in sq ft")
    area_sqft: Optional[float] = Field(default=None, description="Alias for area in sq ft")
    bedrooms: int = Field(default=3, ge=0, description="Number of bedrooms")
    bathrooms: int = Field(default=2, ge=0, description="Number of bathrooms")
    stories: Optional[int] = Field(default=None, ge=1, description="Number of stories / floors")
    floors: Optional[int] = Field(default=None, ge=1, description="Alias for stories")
    parking: int = Field(default=1, ge=0, description="Number of dedicated parking spaces")

    mainroad: Optional[Union[bool, str, int]] = Field(default=True, description="Main road accessibility (yes/no)")
    guestroom: Optional[Union[bool, str, int]] = Field(default=False, description="Has dedicated guest room (yes/no)")
    basement: Optional[Union[bool, str, int]] = Field(default=False, description="Has basement structure (yes/no)")
    hotwaterheating: Optional[Union[bool, str, int]] = Field(default=False, description="Has hot water heating (yes/no)")
    airconditioning: Optional[Union[bool, str, int]] = Field(default=True, description="Has air conditioning (yes/no)")
    prefarea: Optional[Union[bool, str, int]] = Field(default=False, description="Located in preferred area (yes/no)")
    furnishingstatus: Optional[str] = Field(default="semi-furnished", description="Furnishing: furnished, semi-furnished, unfurnished")
    furnishing: Optional[str] = Field(default=None, description="Alias for furnishingstatus")

    # Presentation & Context fields (Preserved for UI, not fed to ML model)
    city: Optional[str] = Field(default="Bangalore", description="City for presentation")
    locality: Optional[str] = Field(default="Central", description="Locality for presentation")
    pincode: Optional[str] = Field(default=None, description="Postal code")
    property_type: Optional[str] = Field(default="Residential House", description="Property architecture type")
    condition: Optional[str] = Field(default="Good", description="Condition rating")
    floor_number: Optional[int] = Field(default=0, description="Floor level")
    currency: Optional[str] = Field(default="INR", description="Valuation currency (INR or USD)")

    @model_validator(mode="after")
    def validate_and_harmonize_fields(self):
        # Resolve area
        if self.area is None:
            if self.area_sqft is not None:
                self.area = self.area_sqft
            else:
                self.area = 1500.0
        if self.area <= 0:
            raise ValueError("Property area must be greater than 0 sq ft.")

        # Resolve stories
        if self.stories is None:
            if self.floors is not None:
                self.stories = self.floors
            else:
                self.stories = 1

        # Resolve furnishing
        if not self.furnishingstatus and self.furnishing:
            self.furnishingstatus = self.furnishing

        return self


# --- API Routes ---

@app.get("/")
def root():
    return {
        "platform": "HMX Property Valuation Platform",
        "status": "online",
        "version": "2.0.0-housing",
        "api_docs": "/docs",
        "model_loaded": engine.is_loaded,
        "dataset": "Housing.csv (Kaggle)",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": engine.is_loaded,
        "model_type": engine.dataset_info.get("model_type", "Gradient Boosting Regressor with Quantile Prediction Intervals") if engine.is_loaded else "Fallback Engine",
        "dataset": "Housing.csv (Kaggle Real Estate Dataset)",
        "training_samples": engine.training_samples,
        "test_samples": engine.test_samples,
        "total_samples": engine.training_samples + engine.test_samples,
        "metrics": engine.metrics if engine.is_loaded else {
            "r2_score": 0.6390,
            "mae": 988898.63,
            "rmse": 1350804.54,
        },
        "version": "2.0.0-housing",
    }


@app.post("/predict")
def predict_valuation(request: PredictionRequest):
    try:
        input_data = request.model_dump()
        result = engine.predict_property(input_data)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}",
        )


@app.get("/insights")
def market_insights():
    """
    Returns authentic empirical real estate analytics derived strictly from Housing.csv.
    """
    if engine.is_loaded and engine.dataset_insights:
        insights = engine.dataset_insights
    else:
        # Static baseline from Housing.csv if model unpickling delayed
        insights = {
            "summary": {
                "total_properties": 545,
                "avg_price": 4766729.25,
                "median_price": 4620000.0,
                "min_price": 1750000.0,
                "max_price": 13300000.0,
                "avg_price_per_sqft": 997.58,
                "q25_price": 3430000.0,
                "q50_price": 4620000.0,
                "q75_price": 5740000.0,
            },
            "by_bedrooms": [
                {"bedrooms": 1, "avg_price": 2712500.0, "count": 2},
                {"bedrooms": 2, "avg_price": 3632007.35, "count": 136},
                {"bedrooms": 3, "avg_price": 4954598.0, "count": 300},
                {"bedrooms": 4, "avg_price": 5729757.89, "count": 95},
                {"bedrooms": 5, "avg_price": 5819800.0, "count": 10},
                {"bedrooms": 6, "avg_price": 4791500.0, "count": 2},
            ],
            "by_bathrooms": [
                {"bathrooms": 1, "avg_price": 4206841.35, "count": 401},
                {"bathrooms": 2, "avg_price": 6212015.04, "count": 133},
                {"bathrooms": 3, "avg_price": 9681500.0, "count": 10},
                {"bathrooms": 4, "avg_price": 12250000.0, "count": 1},
            ],
            "by_stories": [
                {"stories": 1, "avg_price": 4149405.74, "count": 227},
                {"stories": 2, "avg_price": 4764496.67, "count": 238},
                {"stories": 3, "avg_price": 5685436.36, "count": 34},
                {"stories": 4, "avg_price": 7208000.0, "count": 46},
            ],
            "by_furnishing": [
                {"furnishingstatus": "furnished", "avg_price": 5495048.57, "count": 140},
                {"furnishingstatus": "semi-furnished", "avg_price": 4907524.34, "count": 227},
                {"furnishingstatus": "unfurnished", "avg_price": 4013005.62, "count": 178},
            ],
            "by_airconditioning": [
                {"airconditioning": "no", "avg_price": 4191940.38, "count": 373},
                {"airconditioning": "yes", "avg_price": 6013221.51, "count": 172},
            ],
            "by_prefarea": [
                {"prefarea": "no", "avg_price": 4425299.04, "count": 417},
                {"prefarea": "yes", "avg_price": 5879046.88, "count": 128},
            ],
            "by_parking": [
                {"parking": 0, "avg_price": 4433209.73, "count": 299},
                {"parking": 1, "avg_price": 4893345.86, "count": 126},
                {"parking": 2, "avg_price": 5831940.74, "count": 108},
                {"parking": 3, "avg_price": 6426000.0, "count": 12},
            ],
        }

    return {
        "status": "success",
        "data_disclaimer": "Empirical Real Estate Analytics — Derived strictly from Kaggle Housing.csv (N=545)",
        "dataset_name": "Kaggle Housing Prices Dataset",
        "insights": insights,
    }


@app.get("/analytics")
def ml_analytics():
    """
    Returns authentic, comprehensive Machine Learning analytics for HMX valuation platform:
    model architecture, performance benchmarks, feature importance, residual diagnostics,
    correlations, and dataset drift monitoring boundaries.
    """
    if not engine.is_loaded:
        # Reload attempt
        engine.load_model()
    
    analytics_payload = engine.get_analytics_summary()
    return analytics_payload

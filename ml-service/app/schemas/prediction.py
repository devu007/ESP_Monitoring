from pydantic import BaseModel
from typing import Optional


class AnalyzeRequest(BaseModel):
    well_id: str
    upload_id: Optional[str] = None


class AnalyzeResponse(BaseModel):
    well_id: str
    health_score: Optional[float] = None
    risk_level: Optional[str] = None
    failure_probability: Optional[float] = None
    predicted_failure_type: Optional[str] = None
    estimated_failure_window: Optional[str] = None
    confidence: Optional[float] = None
    insufficient_data: bool = False
    missing_data_reason: Optional[str] = None
    contributing_factors: list = []
    anomalies: list = []
    recommendations: list = []
    explanation: str = ""
    health_breakdown: Optional[dict] = None
    rule_results: list = []

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.connection import get_db
from app.schemas.prediction import AnalyzeRequest, AnalyzeResponse
from app.core.prediction_service import run_analysis

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_well(request: AnalyzeRequest, db: Session = Depends(get_db)):
    """Run full analysis pipeline for a well, optionally scoped to a specific upload."""
    result = run_analysis(db, request.well_id, request.upload_id)
    return AnalyzeResponse(**result)


@router.get("/debug/{well_id}")
async def debug_well_data(well_id: str, db: Session = Depends(get_db)):
    """Debug endpoint: shows how many sensor readings are in the DB for a well."""
    count_q = text("SELECT COUNT(*) FROM sensor_readings WHERE well_id = :wid")
    count = db.execute(count_q, {"wid": well_id}).scalar()
    range_q = text(
        "SELECT MIN(timestamp) as min_ts, MAX(timestamp) as max_ts "
        "FROM sensor_readings WHERE well_id = :wid"
    )
    row = db.execute(range_q, {"wid": well_id}).fetchone()
    return {
        "well_id": well_id,
        "total_sensor_readings": count,
        "earliest_timestamp": str(row[0]) if row and row[0] else None,
        "latest_timestamp": str(row[1]) if row and row[1] else None,
    }

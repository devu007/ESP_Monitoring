"""
Prediction Service — Pipeline Orchestrator

Orchestrates the full analysis pipeline:
1. Load sensor data from DB
2. Compute derived metrics
3. Run feature engineering
4. Calculate health score
5. Run rule engine
6. Run anomaly detection
7. Assemble explainable prediction response
"""

import logging
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import DEFAULT_THRESHOLDS

logger = logging.getLogger(__name__)
from app.core.derived_metrics import compute_derived_metrics
from app.core.feature_engineering import compute_features, get_latest_features
from app.core.health_scorer import compute_health_score
from app.core.rule_engine import run_rule_engine, RuleResult
from app.core.anomaly_detector import detect_all_anomalies


COLUMN_MAP = {
    "liquid_rate": "liquid_rate",
    "oil_rate": "oil_rate",
    "water_cut": "water_cut",
    "gas_rate": "gas_rate",
    "gor": "gor",
    "intake_pressure": "intake_pressure",
    "discharge_pressure": "discharge_pressure",
    "annulus_pressure": "annulus_pressure",
    "motor_current": "motor_current",
    "motor_voltage": "motor_voltage",
    "motor_temperature": "motor_temperature",
    "pump_speed": "pump_speed",
    "frequency": "frequency",
    "vibration": "vibration",
    "power_factor": "power_factor",
}


def load_sensor_data(db: Session, well_id: str, upload_id: str | None = None) -> pd.DataFrame:
    """Load sensor readings from PostgreSQL into a DataFrame, optionally filtered by upload_id."""
    if upload_id:
        query = text("""
            SELECT timestamp, liquid_rate, oil_rate, water_cut, gas_rate, gor,
                   intake_pressure, discharge_pressure, annulus_pressure,
                   motor_current, motor_voltage, motor_temperature,
                   pump_speed, frequency, vibration, power_factor
            FROM sensor_readings
            WHERE well_id = :well_id AND upload_id = :upload_id
            ORDER BY timestamp ASC
        """)
        result = db.execute(query, {"well_id": well_id, "upload_id": upload_id})
    else:
        query = text("""
            SELECT timestamp, liquid_rate, oil_rate, water_cut, gas_rate, gor,
                   intake_pressure, discharge_pressure, annulus_pressure,
                   motor_current, motor_voltage, motor_temperature,
                   pump_speed, frequency, vibration, power_factor
            FROM sensor_readings
            WHERE well_id = :well_id
            ORDER BY timestamp ASC
        """)
        result = db.execute(query, {"well_id": well_id})

    rows = result.fetchall()
    columns = result.keys()
    df = pd.DataFrame(rows, columns=list(columns))

    scope = f"upload {upload_id}" if upload_id else "all uploads"
    logger.info(f"Loaded {len(df)} sensor readings for well {well_id} ({scope})")
    if len(df) > 0:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        logger.info(f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")

    return df


def run_analysis(db: Session, well_id: str, upload_id: str | None = None) -> dict:
    """Run the full analysis pipeline for a well, optionally scoped to a specific upload."""

    # Step 1: Load data
    df = load_sensor_data(db, well_id, upload_id)

    min_points = DEFAULT_THRESHOLDS["min_data_points"]
    if len(df) < min_points:
        return {
            "well_id": well_id,
            "health_score": None,
            "risk_level": None,
            "failure_probability": None,
            "predicted_failure_type": None,
            "estimated_failure_window": None,
            "confidence": None,
            "insufficient_data": True,
            "missing_data_reason": (
                f"Only {len(df)} data points available. "
                f"Minimum {min_points} required for meaningful analysis."
            ),
            "contributing_factors": [],
            "anomalies": [],
            "recommendations": ["Upload more historical data to enable analysis."],
            "explanation": "Insufficient data for analysis.",
        }

    logger.info(f"Running analysis on {len(df)} data points for well {well_id}")

    # Step 2: Compute derived metrics
    df = compute_derived_metrics(df)

    # Step 3: Feature engineering
    df = compute_features(df)

    # Step 4: Extract latest features
    features = get_latest_features(df)

    # Step 5: Health score
    health_result = compute_health_score(features)
    logger.info(f"Health score: {health_result['health_score']}, risk: {health_result['risk_level']}")
    for name, data in health_result["breakdown"].items():
        logger.info(f"  {name}: score={data['score']}, weight={data['weight']}, reason={data['reason']}")

    # Step 6: Rule engine
    rule_results: list[RuleResult] = run_rule_engine(features, df)
    for r in rule_results:
        logger.info(f"  Rule triggered: {r.rule_name} ({r.severity}) - {r.failure_type}")

    # Step 7: Anomaly detection
    anomalies = detect_all_anomalies(df)

    # Step 8: Assemble prediction
    prediction = _assemble_prediction(
        well_id, features, health_result, rule_results, anomalies, df
    )

    return prediction


def _assemble_prediction(
    well_id: str,
    features: dict,
    health_result: dict,
    rule_results: list[RuleResult],
    anomalies: list[dict],
    df: pd.DataFrame,
) -> dict:
    """Assemble the final explainable prediction response."""

    # Determine primary failure type from rules (highest severity)
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    sorted_rules = sorted(
        rule_results,
        key=lambda r: severity_order.get(r.severity, 99),
    )
    primary_failure = sorted_rules[0] if sorted_rules else None

    # Contributing factors from health score breakdown
    contributing_factors = []
    for factor_name, factor_data in health_result["breakdown"].items():
        contributing_factors.append({
            "factor": factor_name.replace("_", " ").title(),
            "score": factor_data["score"],
            "weight": factor_data["weight"],
            "weighted_contribution": round(factor_data["score"] * factor_data["weight"], 1),
            "reason": factor_data["reason"],
        })
    contributing_factors.sort(key=lambda f: f["score"])

    # Failure probability heuristic (from rules + health score, NOT from ML)
    failure_prob = _estimate_failure_probability(health_result, rule_results, anomalies)

    # Failure window estimate
    failure_window = _estimate_failure_window(health_result["health_score"], rule_results)

    # Confidence based on data quantity and quality
    data_points = features.get("data_points", 0)
    confidence = min(0.95, max(0.3, data_points / 200))

    # Recommendations
    recommendations = _compile_recommendations(rule_results, health_result, anomalies)

    # Narrative explanation
    explanation = _generate_explanation(features, health_result, rule_results, anomalies)

    # Anomaly summary (top 10 recent)
    anomaly_summary = anomalies[:10]

    return {
        "well_id": well_id,
        "health_score": health_result["health_score"],
        "risk_level": health_result["risk_level"],
        "failure_probability": failure_prob,
        "predicted_failure_type": primary_failure.failure_type if primary_failure else None,
        "estimated_failure_window": failure_window,
        "confidence": round(confidence, 2),
        "insufficient_data": False,
        "missing_data_reason": None,
        "contributing_factors": contributing_factors,
        "anomalies": anomaly_summary,
        "recommendations": recommendations,
        "explanation": explanation,
        "health_breakdown": health_result["breakdown"],
        "rule_results": [
            {
                "rule_name": r.rule_name,
                "failure_type": r.failure_type,
                "severity": r.severity,
                "triggered_conditions": r.triggered_conditions,
                "explanation": r.explanation,
                "recommendation": r.recommendation,
            }
            for r in rule_results
        ],
    }


def _estimate_failure_probability(
    health_result: dict, rule_results: list[RuleResult], anomalies: list[dict]
) -> float | None:
    """Heuristic failure probability based on rules and health score."""
    score = health_result["health_score"]
    if score >= 90 and not rule_results:
        return round(max(0.02, (100 - score) / 200), 2)

    base_prob = max(0, (100 - score) / 100)

    # Boost from rules
    severity_boost = {"CRITICAL": 0.25, "HIGH": 0.15, "MEDIUM": 0.08, "LOW": 0.03}
    for rule in rule_results:
        base_prob += severity_boost.get(rule.severity, 0)

    # Boost from anomaly count
    critical_anomalies = sum(1 for a in anomalies if a["severity"] == "CRITICAL")
    base_prob += critical_anomalies * 0.05

    return round(min(0.98, max(0.01, base_prob)), 2)


def _estimate_failure_window(score: float, rule_results: list[RuleResult]) -> str | None:
    """Estimate time-to-failure window based on health score."""
    has_critical = any(r.severity == "CRITICAL" for r in rule_results)

    if score >= 90:
        return None
    elif score >= 70:
        return "60-90 days" if not has_critical else "30-60 days"
    elif score >= 40:
        return "20-40 days" if not has_critical else "10-20 days"
    else:
        return "5-15 days" if not has_critical else "1-7 days"


def _compile_recommendations(
    rule_results: list[RuleResult], health_result: dict, anomalies: list[dict]
) -> list[str]:
    """Compile actionable recommendations."""
    recs = []

    for rule in rule_results:
        recs.append(rule.recommendation)

    score = health_result["health_score"]
    if score < 40:
        recs.append("URGENT: Schedule immediate ESP inspection and consider preemptive workover.")
    elif score < 70:
        recs.append("Schedule ESP performance review within the next maintenance window.")

    critical_anomalies = [a for a in anomalies if a["severity"] == "CRITICAL"]
    if len(critical_anomalies) > 3:
        recs.append("Multiple critical anomalies detected — increase monitoring frequency.")

    # Deduplicate
    seen = set()
    unique_recs = []
    for r in recs:
        if r not in seen:
            seen.add(r)
            unique_recs.append(r)

    return unique_recs if unique_recs else ["Continue normal monitoring schedule."]


def _generate_explanation(
    features: dict, health_result: dict, rule_results: list[RuleResult], anomalies: list[dict]
) -> str:
    """Generate a human-readable narrative explanation."""
    parts = []
    score = health_result["health_score"]
    risk = health_result["risk_level"]
    parts.append(f"ESP health score is {score:.0f}/100 ({risk} risk).")

    # Highlight the worst scoring factors
    breakdown = health_result["breakdown"]
    worst = sorted(breakdown.items(), key=lambda x: x[1]["score"])[:3]
    for name, data in worst:
        if data["score"] < 70:
            parts.append(data["reason"] + ".")

    # Rule-based findings
    for rule in rule_results:
        parts.append(rule.explanation)

    # Anomaly count
    if anomalies:
        crit = sum(1 for a in anomalies if a["severity"] == "CRITICAL")
        high = sum(1 for a in anomalies if a["severity"] == "HIGH")
        if crit > 0 or high > 0:
            parts.append(
                f"{crit} critical and {high} high-severity anomalies detected in recent data."
            )

    return " ".join(parts)

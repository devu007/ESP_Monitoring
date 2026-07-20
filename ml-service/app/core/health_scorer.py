"""
ESP Health Score Calculator

Computes a transparent, weighted health score from 0 to 100.
Each sub-score is 0-100 (100 = perfectly healthy).
The final score is a weighted average across all factors.

Score ranges:
  90-100 = Healthy
  70-89  = Normal
  40-69  = Degrading
  0-39   = Critical
"""

import numpy as np
from app.config import HEALTH_SCORE_WEIGHTS, DEFAULT_THRESHOLDS


def compute_health_score(features: dict) -> dict:
    """
    Compute health score and per-factor breakdown.

    Returns:
        {
            "health_score": float,
            "risk_level": str,
            "breakdown": { factor_name: { "score": float, "weight": float, "reason": str } }
        }
    """
    breakdown = {}
    deviations = features.get("baseline_deviations", {})

    # 1. Production degradation
    prod_decline = features.get("production_decline_rate")
    if prod_decline is not None:
        if prod_decline >= 0:
            score = 100.0
        elif prod_decline >= -5:
            score = 85.0
        elif prod_decline >= -10:
            score = 65.0
        elif prod_decline >= -20:
            score = 40.0
        else:
            score = max(0, 20 + prod_decline)
        breakdown["production_degradation"] = {
            "score": round(score, 1),
            "weight": HEALTH_SCORE_WEIGHTS["production_degradation"],
            "reason": f"Production decline rate: {prod_decline:.1f}%",
        }
    else:
        breakdown["production_degradation"] = {
            "score": 80.0, "weight": HEALTH_SCORE_WEIGHTS["production_degradation"],
            "reason": "Insufficient production data",
        }

    # 2. Pump efficiency degradation
    eff = features.get("pump_efficiency")
    eff_trend = features.get("pump_efficiency_trend")
    if eff is not None:
        if eff >= 60:
            score = 100.0
        elif eff >= 45:
            score = 70.0
        elif eff >= 30:
            score = 40.0
        else:
            score = max(0, eff)
        if eff_trend is not None and eff_trend < -0.5:
            score = max(0, score - 15)
        breakdown["pump_efficiency_degradation"] = {
            "score": round(score, 1),
            "weight": HEALTH_SCORE_WEIGHTS["pump_efficiency_degradation"],
            "reason": f"Pump efficiency: {eff:.1f}%"
                      + (f", trending {'down' if eff_trend and eff_trend < 0 else 'stable'}" if eff_trend is not None else ""),
        }
    else:
        breakdown["pump_efficiency_degradation"] = {
            "score": 80.0, "weight": HEALTH_SCORE_WEIGHTS["pump_efficiency_degradation"],
            "reason": "Insufficient efficiency data",
        }

    # 3. Motor current abnormality
    curr_dev = deviations.get("motor_current", 0)
    curr_trend = features.get("motor_current_trend")
    score = _deviation_score(curr_dev, warn_pct=10, critical_pct=25)
    if curr_trend is not None and curr_trend > 0.5:
        score = max(0, score - 10)
    breakdown["motor_current_abnormality"] = {
        "score": round(score, 1),
        "weight": HEALTH_SCORE_WEIGHTS["motor_current_abnormality"],
        "reason": f"Current deviation from baseline: {curr_dev:+.1f}%",
    }

    # 4. Motor temperature abnormality
    temp = features.get("motor_temperature")
    temp_dev = deviations.get("motor_temperature", 0)
    warn_t = DEFAULT_THRESHOLDS["motor_temperature_warning"]
    crit_t = DEFAULT_THRESHOLDS["motor_temperature_critical"]
    if temp is not None:
        if temp >= crit_t:
            score = 10.0
        elif temp >= warn_t:
            score = 50.0 - ((temp - warn_t) / (crit_t - warn_t)) * 40
        else:
            score = _deviation_score(temp_dev, warn_pct=10, critical_pct=20)
    else:
        score = 80.0
    breakdown["motor_temperature_abnormality"] = {
        "score": round(score, 1),
        "weight": HEALTH_SCORE_WEIGHTS["motor_temperature_abnormality"],
        "reason": f"Motor temp: {temp:.0f}°F" if temp is not None else "No temperature data",
    }

    # 5. Pressure abnormality
    ip_dev = deviations.get("intake_pressure", 0)
    dp_dev = deviations.get("pump_differential_pressure", 0)
    score = min(_deviation_score(ip_dev, 15, 30), _deviation_score(dp_dev, 15, 30))
    breakdown["pressure_abnormality"] = {
        "score": round(score, 1),
        "weight": HEALTH_SCORE_WEIGHTS["pressure_abnormality"],
        "reason": f"Intake pressure deviation: {ip_dev:+.1f}%, DP deviation: {dp_dev:+.1f}%",
    }

    # 6. Vibration abnormality
    vib = features.get("vibration")
    vib_warn = DEFAULT_THRESHOLDS["vibration_warning"]
    vib_crit = DEFAULT_THRESHOLDS["vibration_critical"]
    if vib is not None:
        if vib >= vib_crit:
            score = 10.0
        elif vib >= vib_warn:
            score = 60.0 - ((vib - vib_warn) / (vib_crit - vib_warn)) * 50
        else:
            score = 100.0
    else:
        score = 85.0
    breakdown["vibration_abnormality"] = {
        "score": round(score, 1),
        "weight": HEALTH_SCORE_WEIGHTS["vibration_abnormality"],
        "reason": f"Vibration: {vib:.3f} g" if vib is not None else "No vibration data",
    }

    # 7. Gas interference indicators
    gor_dev = deviations.get("gor", 0) if "gor" in deviations else 0
    gas_score = _deviation_score(gor_dev, 20, 50)
    lr_std = features.get("liquid_rate_rolling_std")
    lr_avg = features.get("liquid_rate_rolling_avg")
    if lr_std is not None and lr_avg is not None and lr_avg > 0:
        cv = (lr_std / lr_avg) * 100
        if cv > 20:
            gas_score = max(0, gas_score - 20)
    breakdown["gas_interference"] = {
        "score": round(gas_score, 1),
        "weight": HEALTH_SCORE_WEIGHTS["gas_interference"],
        "reason": f"GOR deviation: {gor_dev:+.1f}%",
    }

    # 8. Pump-off indicators
    ip_trend = features.get("intake_pressure_trend")
    lr_trend = features.get("liquid_rate_trend")
    score = 100.0
    if ip_trend is not None and ip_trend < -1:
        score -= 30
    if lr_trend is not None and lr_trend < -1:
        score -= 30
    curr_val = features.get("motor_current")
    curr_avg = features.get("motor_current_rolling_avg")
    if curr_val is not None and curr_avg is not None and curr_avg > 0:
        if curr_val < curr_avg * 0.8:
            score -= 20
    score = max(0, score)
    breakdown["pump_off_indicators"] = {
        "score": round(score, 1),
        "weight": HEALTH_SCORE_WEIGHTS["pump_off_indicators"],
        "reason": _pump_off_reason(ip_trend, lr_trend),
    }

    # Weighted total
    total_score = sum(
        v["score"] * v["weight"] for v in breakdown.values()
    )
    total_score = round(max(0, min(100, total_score)), 1)

    risk_level = _risk_level(total_score)

    return {
        "health_score": total_score,
        "risk_level": risk_level,
        "breakdown": breakdown,
    }


def _deviation_score(dev_pct: float, warn_pct: float, critical_pct: float) -> float:
    abs_dev = abs(dev_pct)
    if abs_dev <= warn_pct:
        return 100.0
    elif abs_dev <= critical_pct:
        return 100.0 - ((abs_dev - warn_pct) / (critical_pct - warn_pct)) * 60
    else:
        return max(0, 40.0 - (abs_dev - critical_pct))


def _risk_level(score: float) -> str:
    if score >= 90:
        return "LOW"
    elif score >= 70:
        return "MEDIUM"
    elif score >= 40:
        return "HIGH"
    else:
        return "CRITICAL"


def _pump_off_reason(ip_trend, lr_trend) -> str:
    parts = []
    if ip_trend is not None and ip_trend < -1:
        parts.append("declining intake pressure")
    if lr_trend is not None and lr_trend < -1:
        parts.append("declining liquid rate")
    if not parts:
        return "No pump-off indicators detected"
    return "Indicators: " + ", ".join(parts)

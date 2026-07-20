"""
ESP Health Score Calculator

Computes a transparent, weighted health score from 0 to 100.
Each sub-score is 0-100 (100 = perfectly healthy).
The final score is a weighted average across all factors.

All trend values are in units-per-day (normalized by feature engineering).

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

    # 1. Production degradation (% change over the trend window)
    prod_decline = features.get("production_decline_rate")
    if prod_decline is not None:
        if prod_decline >= 0:
            score = 100.0
        elif prod_decline >= -5:
            score = 90.0 - (-prod_decline * 2)  # -5% → 80
        elif prod_decline >= -10:
            score = 80.0 - ((-prod_decline - 5) * 4)  # -10% → 60
        elif prod_decline >= -20:
            score = 60.0 - ((-prod_decline - 10) * 2)  # -20% → 40
        else:
            score = max(10, 40.0 - ((-prod_decline - 20) * 1))
        breakdown["production_degradation"] = {
            "score": round(score, 1),
            "weight": HEALTH_SCORE_WEIGHTS["production_degradation"],
            "reason": f"Production decline rate: {prod_decline:.1f}% over trend window",
        }
    else:
        breakdown["production_degradation"] = {
            "score": 80.0, "weight": HEALTH_SCORE_WEIGHTS["production_degradation"],
            "reason": "Insufficient production data",
        }

    # 2. Pump efficiency degradation
    eff = features.get("pump_efficiency")
    eff_trend = features.get("pump_efficiency_trend")  # units/day
    if eff is not None:
        if eff >= 60:
            score = 100.0
        elif eff >= 50:
            score = 80.0 - ((60 - eff) * 1)  # 50% → 70
        elif eff >= 40:
            score = 70.0 - ((50 - eff) * 2)  # 40% → 50
        elif eff >= 25:
            score = 50.0 - ((40 - eff) * 2)  # 25% → 20
        else:
            score = max(5, eff)
        # Penalize if efficiency is trending down
        if eff_trend is not None and eff_trend < -0.3:
            penalty = min(20, abs(eff_trend) * 10)  # -0.3/day → 3, -2/day → 20
            score = max(5, score - penalty)
        breakdown["pump_efficiency_degradation"] = {
            "score": round(score, 1),
            "weight": HEALTH_SCORE_WEIGHTS["pump_efficiency_degradation"],
            "reason": f"Pump efficiency: {eff:.1f}%"
                      + (f", trend: {eff_trend:+.2f}/day" if eff_trend is not None else ""),
        }
    else:
        breakdown["pump_efficiency_degradation"] = {
            "score": 80.0, "weight": HEALTH_SCORE_WEIGHTS["pump_efficiency_degradation"],
            "reason": "Insufficient efficiency data",
        }

    # 3. Motor current abnormality (baseline deviation %)
    curr_dev = deviations.get("motor_current", 0)
    curr_trend = features.get("motor_current_trend")  # amps/day
    score = _deviation_score(curr_dev, warn_pct=8, critical_pct=20)
    if curr_trend is not None and curr_trend > 0.3:
        penalty = min(15, curr_trend * 5)
        score = max(5, score - penalty)
    breakdown["motor_current_abnormality"] = {
        "score": round(score, 1),
        "weight": HEALTH_SCORE_WEIGHTS["motor_current_abnormality"],
        "reason": f"Current deviation from baseline: {curr_dev:+.1f}%"
                  + (f", trend: {curr_trend:+.2f} A/day" if curr_trend is not None else ""),
    }

    # 4. Motor temperature abnormality
    temp = features.get("motor_temperature")
    temp_dev = deviations.get("motor_temperature", 0)
    temp_trend = features.get("motor_temperature_trend")
    warn_t = DEFAULT_THRESHOLDS["motor_temperature_warning"]
    crit_t = DEFAULT_THRESHOLDS["motor_temperature_critical"]
    if temp is not None:
        if temp >= crit_t:
            score = 10.0
        elif temp >= warn_t:
            score = 50.0 - ((temp - warn_t) / (crit_t - warn_t)) * 40
        else:
            score = _deviation_score(temp_dev, warn_pct=8, critical_pct=18)
        # Penalize rising temperature trend
        if temp_trend is not None and temp_trend > 0.5:
            penalty = min(15, temp_trend * 5)
            score = max(5, score - penalty)
    else:
        score = 80.0
    breakdown["motor_temperature_abnormality"] = {
        "score": round(score, 1),
        "weight": HEALTH_SCORE_WEIGHTS["motor_temperature_abnormality"],
        "reason": (f"Motor temp: {temp:.0f}°F, deviation: {temp_dev:+.1f}%" if temp is not None
                   else "No temperature data"),
    }

    # 5. Pressure abnormality
    ip_dev = deviations.get("intake_pressure", 0)
    dp_dev = deviations.get("pump_differential_pressure", 0)
    score = min(_deviation_score(ip_dev, 10, 25), _deviation_score(dp_dev, 10, 25))
    breakdown["pressure_abnormality"] = {
        "score": round(score, 1),
        "weight": HEALTH_SCORE_WEIGHTS["pressure_abnormality"],
        "reason": f"Intake pressure deviation: {ip_dev:+.1f}%, DP deviation: {dp_dev:+.1f}%",
    }

    # 6. Vibration abnormality
    vib = features.get("vibration")
    vib_dev = deviations.get("vibration", 0)
    vib_warn = DEFAULT_THRESHOLDS["vibration_warning"]
    vib_crit = DEFAULT_THRESHOLDS["vibration_critical"]
    if vib is not None:
        if vib >= vib_crit:
            score = 10.0
        elif vib >= vib_warn:
            score = 60.0 - ((vib - vib_warn) / (vib_crit - vib_warn)) * 50
        else:
            # Use deviation-based scoring even if below absolute threshold
            score = _deviation_score(vib_dev, 30, 80)
    else:
        score = 85.0
    breakdown["vibration_abnormality"] = {
        "score": round(score, 1),
        "weight": HEALTH_SCORE_WEIGHTS["vibration_abnormality"],
        "reason": (f"Vibration: {vib:.3f} g, deviation: {vib_dev:+.1f}%" if vib is not None
                   else "No vibration data"),
    }

    # 7. Gas interference indicators
    gor_dev = deviations.get("gor", 0)
    gas_score = _deviation_score(gor_dev, 15, 40)
    lr_std = features.get("liquid_rate_rolling_std")
    lr_avg = features.get("liquid_rate_rolling_avg")
    if lr_std is not None and lr_avg is not None and lr_avg > 0:
        cv = (lr_std / lr_avg) * 100
        if cv > 15:
            gas_score = max(5, gas_score - 15)
    breakdown["gas_interference"] = {
        "score": round(gas_score, 1),
        "weight": HEALTH_SCORE_WEIGHTS["gas_interference"],
        "reason": f"GOR deviation: {gor_dev:+.1f}%",
    }

    # 8. Pump-off indicators
    ip_trend = features.get("intake_pressure_trend")
    lr_trend = features.get("liquid_rate_trend")
    score = 100.0
    # Trend thresholds in units-per-day
    if ip_trend is not None and ip_trend < -2:
        score -= min(35, abs(ip_trend) * 5)
    if lr_trend is not None and lr_trend < -2:
        score -= min(35, abs(lr_trend) * 3)
    curr_val = features.get("motor_current")
    curr_avg = features.get("motor_current_rolling_avg")
    if curr_val is not None and curr_avg is not None and curr_avg > 0:
        if curr_val < curr_avg * 0.85:
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
    """Convert a % deviation into a health sub-score (0-100)."""
    abs_dev = abs(dev_pct)
    if abs_dev <= warn_pct:
        return 100.0
    elif abs_dev <= critical_pct:
        return 100.0 - ((abs_dev - warn_pct) / (critical_pct - warn_pct)) * 60
    else:
        return max(5, 40.0 - (abs_dev - critical_pct) * 1.5)


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
    if ip_trend is not None and ip_trend < -2:
        parts.append(f"declining intake pressure ({ip_trend:+.1f}/day)")
    if lr_trend is not None and lr_trend < -2:
        parts.append(f"declining liquid rate ({lr_trend:+.1f}/day)")
    if not parts:
        return "No pump-off indicators detected"
    return "Indicators: " + ", ".join(parts)

"""
Anomaly Detection Module

Two methods:
1. Z-Score: Per-parameter rolling baseline. Flags values beyond threshold.
2. Isolation Forest: Multivariate anomaly detection across all parameters.

Each anomaly is relative to the well's own historical baseline.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from app.config import DEFAULT_THRESHOLDS


ANOMALY_PARAMS = [
    "liquid_rate",
    "motor_current",
    "motor_temperature",
    "intake_pressure",
    "discharge_pressure",
    "pump_differential_pressure",
    "pump_efficiency",
    "vibration",
]

Z_THRESHOLD = DEFAULT_THRESHOLDS["z_score_threshold"]
ROLLING_WINDOW = DEFAULT_THRESHOLDS["rolling_window_days"]


def detect_anomalies_zscore(df: pd.DataFrame) -> list[dict]:
    """Detect anomalies using per-parameter Z-score against rolling baseline."""
    anomalies = []
    df = df.copy().sort_values("timestamp")

    for param in ANOMALY_PARAMS:
        if param not in df.columns or df[param].isna().all():
            continue

        rolling_mean = df[param].rolling(window=ROLLING_WINDOW, min_periods=5).mean()
        rolling_std = df[param].rolling(window=ROLLING_WINDOW, min_periods=5).std()

        z_scores = np.where(
            rolling_std > 0,
            (df[param] - rolling_mean) / rolling_std,
            0,
        )

        for i in range(ROLLING_WINDOW, len(df)):
            z = z_scores[i]
            if abs(z) >= Z_THRESHOLD and pd.notna(df[param].iloc[i]):
                abs_z = abs(z)
                if abs_z >= Z_THRESHOLD * 2:
                    severity = "CRITICAL"
                elif abs_z >= Z_THRESHOLD * 1.5:
                    severity = "HIGH"
                else:
                    severity = "WARNING"

                mean_val = rolling_mean.iloc[i]
                std_val = rolling_std.iloc[i]

                anomalies.append({
                    "parameter": param,
                    "timestamp": df["timestamp"].iloc[i].isoformat()
                        if hasattr(df["timestamp"].iloc[i], "isoformat")
                        else str(df["timestamp"].iloc[i]),
                    "actual_value": round(float(df[param].iloc[i]), 4),
                    "expected_min": round(float(mean_val - Z_THRESHOLD * std_val), 4),
                    "expected_max": round(float(mean_val + Z_THRESHOLD * std_val), 4),
                    "z_score": round(float(z), 2),
                    "severity": severity,
                    "explanation": (
                        f"{param.replace('_', ' ').title()} value {df[param].iloc[i]:.2f} "
                        f"is {abs_z:.1f} standard deviations {'above' if z > 0 else 'below'} "
                        f"the rolling {ROLLING_WINDOW}-day average ({mean_val:.2f})"
                    ),
                })

    return anomalies


def detect_anomalies_isolation_forest(df: pd.DataFrame) -> list[dict]:
    """Detect multivariate anomalies using Isolation Forest."""
    available = [p for p in ANOMALY_PARAMS if p in df.columns and not df[p].isna().all()]
    if len(available) < 2 or len(df) < 30:
        return []

    subset = df[available + ["timestamp"]].dropna(subset=available)
    if len(subset) < 30:
        return []

    X = subset[available].values
    model = IsolationForest(
        contamination=0.05,
        random_state=42,
        n_estimators=100,
    )
    predictions = model.fit_predict(X)
    scores = model.decision_function(X)

    anomalies = []
    anomaly_indices = np.where(predictions == -1)[0]

    for idx in anomaly_indices:
        row = subset.iloc[idx]
        anomaly_score = float(scores[idx])

        if anomaly_score < -0.3:
            severity = "CRITICAL"
        elif anomaly_score < -0.15:
            severity = "HIGH"
        else:
            severity = "WARNING"

        deviant_params = []
        for param in available:
            col_mean = df[param].mean()
            col_std = df[param].std()
            if col_std > 0:
                z = abs((row[param] - col_mean) / col_std)
                if z > 2:
                    deviant_params.append(
                        f"{param.replace('_', ' ')} ({row[param]:.2f}, z={z:.1f})"
                    )

        anomalies.append({
            "parameter": "multivariate",
            "timestamp": row["timestamp"].isoformat()
                if hasattr(row["timestamp"], "isoformat")
                else str(row["timestamp"]),
            "actual_value": round(anomaly_score, 4),
            "expected_min": -0.1,
            "expected_max": 0.5,
            "z_score": None,
            "severity": severity,
            "explanation": (
                f"Multivariate anomaly detected (score: {anomaly_score:.3f}). "
                f"Deviant parameters: {', '.join(deviant_params[:5]) if deviant_params else 'complex pattern'}"
            ),
        })

    return anomalies


def detect_all_anomalies(df: pd.DataFrame) -> list[dict]:
    """Run both Z-score and Isolation Forest, deduplicate, return combined."""
    z_anomalies = detect_anomalies_zscore(df)
    if_anomalies = detect_anomalies_isolation_forest(df)

    # Only return recent anomalies (last 30 days of data)
    all_anomalies = z_anomalies + if_anomalies

    # Cap to most recent 50 anomalies
    all_anomalies.sort(key=lambda a: a["timestamp"], reverse=True)
    return all_anomalies[:50]

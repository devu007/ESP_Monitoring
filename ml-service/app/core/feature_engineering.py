"""
Feature Engineering Module

Computes rolling statistics, trends, rate-of-change, and baseline deviations
from the sensor + derived metric data.
"""

import pandas as pd
import numpy as np
from app.config import DEFAULT_THRESHOLDS


ROLLING_WINDOW = DEFAULT_THRESHOLDS["rolling_window_days"]
TREND_WINDOW = DEFAULT_THRESHOLDS["trend_window_days"]

KEY_PARAMS = [
    "liquid_rate",
    "oil_rate",
    "motor_current",
    "motor_temperature",
    "intake_pressure",
    "discharge_pressure",
    "pump_differential_pressure",
    "pump_efficiency",
    "vibration",
    "frequency",
]


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add rolling averages, std devs, trends, and rate-of-change features."""
    df = df.copy().sort_values("timestamp")

    for param in KEY_PARAMS:
        if param not in df.columns:
            continue
        col = df[param]
        if col.isna().all():
            continue

        # Rolling mean and std
        df[f"{param}_rolling_avg"] = col.rolling(
            window=ROLLING_WINDOW, min_periods=3
        ).mean()
        df[f"{param}_rolling_std"] = col.rolling(
            window=ROLLING_WINDOW, min_periods=3
        ).std()

        # Rate of change (difference from previous reading)
        df[f"{param}_roc"] = col.diff()

        # Trend: slope over the trend window via simple linear regression
        df[f"{param}_trend"] = (
            col.rolling(window=TREND_WINDOW, min_periods=5)
            .apply(_linear_slope, raw=True)
        )

    # Production decline rate (% change over trend window)
    if "liquid_rate" in df.columns and not df["liquid_rate"].isna().all():
        lr = df["liquid_rate"]
        lr_shifted = lr.shift(TREND_WINDOW)
        df["production_decline_rate"] = np.where(
            lr_shifted > 0,
            ((lr - lr_shifted) / lr_shifted) * 100.0,
            np.nan,
        )
    else:
        df["production_decline_rate"] = np.nan

    # Deviation from historical baseline (% deviation from rolling mean)
    baseline_deviations = {}
    for param in KEY_PARAMS:
        avg_col = f"{param}_rolling_avg"
        if avg_col in df.columns and param in df.columns:
            last_val = df[param].iloc[-1] if len(df) > 0 else np.nan
            last_avg = df[avg_col].iloc[-1] if len(df) > 0 else np.nan
            if pd.notna(last_val) and pd.notna(last_avg) and last_avg != 0:
                baseline_deviations[param] = round(
                    ((last_val - last_avg) / abs(last_avg)) * 100.0, 2
                )

    df.attrs["baseline_deviations"] = baseline_deviations
    return df


def _linear_slope(values: np.ndarray) -> float:
    """Compute the slope of a simple linear regression on an array."""
    n = len(values)
    if n < 2:
        return np.nan
    valid = ~np.isnan(values)
    if valid.sum() < 2:
        return np.nan
    x = np.arange(n)[valid]
    y = values[valid]
    x_mean = x.mean()
    y_mean = y.mean()
    denom = ((x - x_mean) ** 2).sum()
    if denom == 0:
        return 0.0
    return float(((x - x_mean) * (y - y_mean)).sum() / denom)


def get_latest_features(df: pd.DataFrame) -> dict:
    """Extract the latest feature values from the DataFrame for scoring."""
    if len(df) == 0:
        return {}

    last = df.iloc[-1]
    features = {}
    for col in df.columns:
        val = last[col]
        if isinstance(val, (np.floating, float)):
            features[col] = None if pd.isna(val) else round(float(val), 4)
        elif isinstance(val, (np.integer, int)):
            features[col] = int(val)

    features["baseline_deviations"] = df.attrs.get("baseline_deviations", {})
    features["data_points"] = len(df)
    return features

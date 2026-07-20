"""
Feature Engineering Module

Computes rolling statistics, trends, rate-of-change, and baseline deviations
from the sensor + derived metric data.

All rolling windows are time-aware: the config specifies windows in days,
and this module converts to data-point counts based on the actual sampling
frequency detected in the data.
"""

import logging
import pandas as pd
import numpy as np
from app.config import DEFAULT_THRESHOLDS

logger = logging.getLogger(__name__)

ROLLING_WINDOW_DAYS = DEFAULT_THRESHOLDS["rolling_window_days"]
TREND_WINDOW_DAYS = DEFAULT_THRESHOLDS["trend_window_days"]

KEY_PARAMS = [
    "liquid_rate",
    "oil_rate",
    "water_cut",
    "motor_current",
    "motor_temperature",
    "intake_pressure",
    "discharge_pressure",
    "pump_differential_pressure",
    "pump_efficiency",
    "vibration",
    "frequency",
    "power_factor",
    "gor",
]


def _detect_frequency(df: pd.DataFrame) -> float:
    """Detect how many data points per day exist in the dataset."""
    if len(df) < 2:
        return 1.0
    time_diffs = df["timestamp"].diff().dropna()
    median_diff = time_diffs.median()
    if median_diff.total_seconds() <= 0:
        return 1.0
    points_per_day = pd.Timedelta(days=1) / median_diff
    return max(1.0, float(points_per_day))


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add rolling averages, std devs, trends, and rate-of-change features."""
    df = df.copy().sort_values("timestamp").reset_index(drop=True)

    ppd = _detect_frequency(df)
    rolling_pts = max(10, int(ROLLING_WINDOW_DAYS * ppd))
    trend_pts = max(10, int(TREND_WINDOW_DAYS * ppd))

    # Use the first 'rolling_pts' points as the healthy baseline
    baseline_end = min(rolling_pts, int(len(df) * 0.6))

    logger.info(
        f"Feature engineering: {len(df)} pts, {ppd:.1f} pts/day, "
        f"rolling={rolling_pts} pts ({ROLLING_WINDOW_DAYS}d), "
        f"trend={trend_pts} pts ({TREND_WINDOW_DAYS}d), "
        f"baseline from first {baseline_end} pts"
    )

    for param in KEY_PARAMS:
        if param not in df.columns:
            continue
        col = df[param]
        if col.isna().all():
            continue

        # Rolling mean and std over the full rolling window
        df[f"{param}_rolling_avg"] = col.rolling(
            window=rolling_pts, min_periods=max(5, int(ppd))
        ).mean()
        df[f"{param}_rolling_std"] = col.rolling(
            window=rolling_pts, min_periods=max(5, int(ppd))
        ).std()

        # Rate of change (per-day: diff / time_delta_in_days)
        df[f"{param}_roc"] = col.diff() / max(1, 1.0 / ppd)

        # Trend: slope over the trend window, normalized to per-day units
        df[f"{param}_trend"] = (
            col.rolling(window=trend_pts, min_periods=max(5, int(ppd * 2)))
            .apply(lambda v: _linear_slope_per_day(v, ppd), raw=True)
        )

    # Production decline rate: % change comparing current value to value trend_window_days ago
    if "liquid_rate" in df.columns and not df["liquid_rate"].isna().all():
        lr = df["liquid_rate"]
        lr_shifted = lr.shift(trend_pts)
        df["production_decline_rate"] = np.where(
            lr_shifted > 0,
            ((lr - lr_shifted) / lr_shifted) * 100.0,
            np.nan,
        )
    else:
        df["production_decline_rate"] = np.nan

    # Baseline deviations: compare last value to the healthy-period baseline mean
    baseline_deviations = {}
    for param in KEY_PARAMS:
        if param not in df.columns or df[param].isna().all():
            continue
        baseline_mean = df[param].iloc[:baseline_end].mean()
        last_val = df[param].iloc[-1]
        if pd.notna(last_val) and pd.notna(baseline_mean) and baseline_mean != 0:
            baseline_deviations[param] = round(
                ((last_val - baseline_mean) / abs(baseline_mean)) * 100.0, 2
            )

    df.attrs["baseline_deviations"] = baseline_deviations
    logger.info(f"Baseline deviations: {baseline_deviations}")
    return df


def _linear_slope_per_day(values: np.ndarray, ppd: float) -> float:
    """Compute the slope of a linear regression, normalized to units per day."""
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
    slope_per_point = float(((x - x_mean) * (y - y_mean)).sum() / denom)
    return slope_per_point * ppd


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

"""
Derived Metrics Computation Module

Calculates engineering-derived parameters from raw sensor readings:
- Pump differential pressure
- Pump head
- Hydraulic power
- Electrical power
- Pump efficiency
"""

import pandas as pd
import numpy as np


FLUID_GRADIENT_PSI_PER_FT = 0.433  # water gradient, adjust for specific gravity
PUMP_CONSTANT = 1.7005e-5  # for hydraulic HP: (flow_bpd * dp_psi) / 1714


def compute_derived_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived metric columns to the sensor readings DataFrame."""
    df = df.copy()

    # Pump differential pressure (discharge - intake)
    if "discharge_pressure" in df.columns and "intake_pressure" in df.columns:
        df["pump_differential_pressure"] = df["discharge_pressure"] - df["intake_pressure"]
    else:
        df["pump_differential_pressure"] = np.nan

    # Pump head (ft) = DP / fluid gradient
    if "pump_differential_pressure" in df.columns:
        df["pump_head"] = df["pump_differential_pressure"] / FLUID_GRADIENT_PSI_PER_FT
    else:
        df["pump_head"] = np.nan

    # Hydraulic power (HP) = (Q * DP) / 1714
    if "liquid_rate" in df.columns and "pump_differential_pressure" in df.columns:
        df["hydraulic_power"] = (
            df["liquid_rate"] * df["pump_differential_pressure"]
        ) / 1714.0
    else:
        df["hydraulic_power"] = np.nan

    # Electrical power (kW) = V * I * PF * sqrt(3) / 1000 (3-phase)
    has_electrical = all(
        c in df.columns for c in ["motor_voltage", "motor_current", "power_factor"]
    )
    if has_electrical:
        df["electrical_power"] = (
            df["motor_voltage"]
            * df["motor_current"]
            * df["power_factor"]
            * np.sqrt(3)
            / 1000.0
        )
    else:
        df["electrical_power"] = np.nan

    # Pump efficiency (%) = hydraulic power / electrical power * 100
    if "hydraulic_power" in df.columns and "electrical_power" in df.columns:
        hp_kw = df["hydraulic_power"] * 0.7457  # convert HP to kW
        df["pump_efficiency"] = np.where(
            df["electrical_power"] > 0,
            (hp_kw / df["electrical_power"]) * 100.0,
            np.nan,
        )
        df["pump_efficiency"] = df["pump_efficiency"].clip(0, 100)
    else:
        df["pump_efficiency"] = np.nan

    return df

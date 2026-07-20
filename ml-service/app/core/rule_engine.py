"""
Extensible Rule-Based Failure Detection Engine

Each rule is a class implementing BaseRule.evaluate().
Rules are registered in RULES list and iterated by the engine.
New rules are added by creating a class and appending to RULES.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
import pandas as pd
import numpy as np


@dataclass
class RuleResult:
    rule_name: str
    failure_type: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    triggered_conditions: list[str]
    explanation: str
    supporting_parameters: dict
    recommendation: str


class BaseRule(ABC):
    name: str = ""
    failure_type: str = ""

    @abstractmethod
    def evaluate(self, features: dict, df: pd.DataFrame) -> Optional[RuleResult]:
        """Return RuleResult if triggered, None otherwise."""
        pass


class GasInterferenceRule(BaseRule):
    name = "Gas Interference Detection"
    failure_type = "GAS_INTERFERENCE"

    def evaluate(self, features: dict, df: pd.DataFrame) -> Optional[RuleResult]:
        conditions = []
        params = {}

        gor_dev = features.get("baseline_deviations", {}).get("gor", 0)
        if gor_dev > 15:
            conditions.append(f"GOR increased {gor_dev:.1f}% above baseline")
            params["gor_deviation_pct"] = gor_dev

        dp_trend = features.get("pump_differential_pressure_trend")
        if dp_trend is not None and dp_trend < -0.5:
            conditions.append(f"Pump DP trending down (slope: {dp_trend:.2f})")
            params["dp_trend"] = dp_trend

        lr_std = features.get("liquid_rate_rolling_std")
        lr_avg = features.get("liquid_rate_rolling_avg")
        if lr_std and lr_avg and lr_avg > 0:
            cv = (lr_std / lr_avg) * 100
            if cv > 15:
                conditions.append(f"Unstable liquid rate (CV: {cv:.1f}%)")
                params["liquid_rate_cv"] = round(cv, 1)

        curr_std = features.get("motor_current_rolling_std")
        curr_avg = features.get("motor_current_rolling_avg")
        if curr_std and curr_avg and curr_avg > 0:
            curr_cv = (curr_std / curr_avg) * 100
            if curr_cv > 10:
                conditions.append(f"Unstable motor current (CV: {curr_cv:.1f}%)")
                params["current_cv"] = round(curr_cv, 1)

        if len(conditions) >= 2:
            severity = "HIGH" if len(conditions) >= 3 else "MEDIUM"
            return RuleResult(
                rule_name=self.name,
                failure_type=self.failure_type,
                severity=severity,
                triggered_conditions=conditions,
                explanation=f"Multiple indicators suggest gas interference: {'; '.join(conditions)}.",
                supporting_parameters=params,
                recommendation="Investigate gas-liquid ratio at intake. Consider installing or adjusting gas separator. Check well GOR trends.",
            )
        return None


class PumpOffRule(BaseRule):
    name = "Pump-Off Detection"
    failure_type = "PUMP_OFF"

    def evaluate(self, features: dict, df: pd.DataFrame) -> Optional[RuleResult]:
        conditions = []
        params = {}

        ip_trend = features.get("intake_pressure_trend")
        if ip_trend is not None and ip_trend < -1.0:
            conditions.append(f"Intake pressure declining (slope: {ip_trend:.2f})")
            params["intake_pressure_trend"] = ip_trend

        lr_trend = features.get("liquid_rate_trend")
        if lr_trend is not None and lr_trend < -1.0:
            conditions.append(f"Liquid rate declining (slope: {lr_trend:.2f})")
            params["liquid_rate_trend"] = lr_trend

        curr = features.get("motor_current")
        curr_avg = features.get("motor_current_rolling_avg")
        if curr is not None and curr_avg is not None and curr_avg > 0:
            if curr < curr_avg * 0.8:
                conditions.append(f"Low motor current ({curr:.1f}A vs avg {curr_avg:.1f}A)")
                params["motor_current"] = curr
                params["motor_current_avg"] = curr_avg

        if len(conditions) >= 2:
            severity = "HIGH" if len(conditions) >= 3 else "MEDIUM"
            return RuleResult(
                rule_name=self.name,
                failure_type=self.failure_type,
                severity=severity,
                triggered_conditions=conditions,
                explanation=f"Pump-off conditions detected: {'; '.join(conditions)}. The pump may be operating with insufficient fluid intake.",
                supporting_parameters=params,
                recommendation="Reduce pump speed or frequency. Verify reservoir pressure and inflow performance. Consider installing pump-off controller.",
            )
        return None


class PumpDegradationRule(BaseRule):
    name = "Pump Degradation Detection"
    failure_type = "PUMP_DEGRADATION"

    def evaluate(self, features: dict, df: pd.DataFrame) -> Optional[RuleResult]:
        conditions = []
        params = {}

        prod_decline = features.get("production_decline_rate")
        if prod_decline is not None and prod_decline < -10:
            conditions.append(f"Production declined {prod_decline:.1f}%")
            params["production_decline_rate"] = prod_decline

        eff = features.get("pump_efficiency")
        eff_trend = features.get("pump_efficiency_trend")
        if eff_trend is not None and eff_trend < -0.3:
            conditions.append(f"Pump efficiency declining (slope: {eff_trend:.2f})")
            params["pump_efficiency_trend"] = eff_trend
        if eff is not None and eff < 40:
            conditions.append(f"Low pump efficiency: {eff:.1f}%")
            params["pump_efficiency"] = eff

        curr_trend = features.get("motor_current_trend")
        if curr_trend is not None and curr_trend > 0.3:
            conditions.append(f"Motor current increasing (slope: {curr_trend:.2f})")
            params["motor_current_trend"] = curr_trend

        head_trend = features.get("pump_differential_pressure_trend")
        if head_trend is not None and head_trend < -0.5:
            conditions.append(f"Pump head declining (slope: {head_trend:.2f})")
            params["pump_head_trend"] = head_trend

        if len(conditions) >= 2:
            severity = "CRITICAL" if len(conditions) >= 4 else "HIGH" if len(conditions) >= 3 else "MEDIUM"
            return RuleResult(
                rule_name=self.name,
                failure_type=self.failure_type,
                severity=severity,
                triggered_conditions=conditions,
                explanation=f"Pump degradation pattern detected: {'; '.join(conditions)}. Pump may be experiencing wear, erosion, or internal damage.",
                supporting_parameters=params,
                recommendation="Schedule pump inspection. Compare current performance curve with design curve. Plan for potential workover.",
            )
        return None


class MotorOverheatingRule(BaseRule):
    name = "Motor Overheating Detection"
    failure_type = "MOTOR_OVERHEATING"

    def evaluate(self, features: dict, df: pd.DataFrame) -> Optional[RuleResult]:
        conditions = []
        params = {}

        temp = features.get("motor_temperature")
        from app.config import DEFAULT_THRESHOLDS
        warn_t = DEFAULT_THRESHOLDS["motor_temperature_warning"]
        crit_t = DEFAULT_THRESHOLDS["motor_temperature_critical"]

        if temp is not None:
            if temp >= crit_t:
                conditions.append(f"Motor temperature CRITICAL: {temp:.0f}°F (threshold: {crit_t}°F)")
                params["motor_temperature"] = temp
            elif temp >= warn_t:
                conditions.append(f"Motor temperature elevated: {temp:.0f}°F (warning: {warn_t}°F)")
                params["motor_temperature"] = temp

        curr_trend = features.get("motor_current_trend")
        if curr_trend is not None and curr_trend > 0.5:
            conditions.append(f"Increasing motor current (slope: {curr_trend:.2f})")
            params["motor_current_trend"] = curr_trend

        temp_trend = features.get("motor_temperature_trend")
        if temp_trend is not None and temp_trend > 0.5:
            conditions.append(f"Temperature trending up (slope: {temp_trend:.2f})")
            params["motor_temperature_trend"] = temp_trend

        if len(conditions) >= 1 and temp is not None and temp >= warn_t:
            severity = "CRITICAL" if temp >= crit_t else "HIGH"
            return RuleResult(
                rule_name=self.name,
                failure_type=self.failure_type,
                severity=severity,
                triggered_conditions=conditions,
                explanation=f"Motor overheating detected: {'; '.join(conditions)}. Prolonged high temperature can cause insulation failure.",
                supporting_parameters=params,
                recommendation="Reduce operating speed immediately. Check for adequate fluid flow past motor for cooling. Inspect for winding damage.",
            )
        return None


class MechanicalDamageRule(BaseRule):
    name = "Mechanical/ESP Damage Detection"
    failure_type = "MECHANICAL_DAMAGE"

    def evaluate(self, features: dict, df: pd.DataFrame) -> Optional[RuleResult]:
        conditions = []
        params = {}
        from app.config import DEFAULT_THRESHOLDS

        vib = features.get("vibration")
        vib_crit = DEFAULT_THRESHOLDS["vibration_critical"]
        vib_warn = DEFAULT_THRESHOLDS["vibration_warning"]
        if vib is not None and vib >= vib_warn:
            label = "CRITICAL" if vib >= vib_crit else "elevated"
            conditions.append(f"Vibration {label}: {vib:.3f} g")
            params["vibration"] = vib

        curr_dev = features.get("baseline_deviations", {}).get("motor_current", 0)
        if abs(curr_dev) > 20:
            conditions.append(f"Abnormal motor current (deviation: {curr_dev:+.1f}%)")
            params["motor_current_deviation_pct"] = curr_dev

        prod_decline = features.get("production_decline_rate")
        if prod_decline is not None and prod_decline < -20:
            conditions.append(f"Sudden production decline: {prod_decline:.1f}%")
            params["production_decline_rate"] = prod_decline

        if len(conditions) >= 2:
            severity = "CRITICAL" if vib is not None and vib >= vib_crit else "HIGH"
            return RuleResult(
                rule_name=self.name,
                failure_type=self.failure_type,
                severity=severity,
                triggered_conditions=conditions,
                explanation=f"Possible mechanical or ESP damage: {'; '.join(conditions)}. May indicate shaft damage, bearing wear, or impeller damage.",
                supporting_parameters=params,
                recommendation="Pull ESP for inspection. Review vibration spectrum if available. Check for sand production or scale buildup.",
            )
        return None


# Register all rules
RULES: list[BaseRule] = [
    GasInterferenceRule(),
    PumpOffRule(),
    PumpDegradationRule(),
    MotorOverheatingRule(),
    MechanicalDamageRule(),
]


def run_rule_engine(features: dict, df: pd.DataFrame) -> list[RuleResult]:
    """Execute all registered rules and return triggered results."""
    results = []
    for rule in RULES:
        result = rule.evaluate(features, df)
        if result is not None:
            results.append(result)
    return results

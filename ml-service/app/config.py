import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/esp_monitoring"
)

HEALTH_SCORE_WEIGHTS = {
    "production_degradation": 0.20,
    "pump_efficiency_degradation": 0.20,
    "motor_current_abnormality": 0.15,
    "motor_temperature_abnormality": 0.15,
    "pressure_abnormality": 0.10,
    "vibration_abnormality": 0.10,
    "gas_interference": 0.05,
    "pump_off_indicators": 0.05,
}

DEFAULT_THRESHOLDS = {
    "motor_temperature_warning": 250,
    "motor_temperature_critical": 300,
    "vibration_warning": 0.5,
    "vibration_critical": 1.0,
    "z_score_threshold": 3.0,
    "min_data_points": 30,
    "rolling_window_days": 30,
    "trend_window_days": 14,
}

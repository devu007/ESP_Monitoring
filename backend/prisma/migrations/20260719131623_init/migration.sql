-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'VALIDATING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fields" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wells" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_number" TEXT,
    "field_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esps" (
    "id" TEXT NOT NULL,
    "well_id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "installation_date" TIMESTAMP(3) NOT NULL,
    "pump_stages" INTEGER NOT NULL,
    "rated_power" DOUBLE PRECISION NOT NULL,
    "rated_speed" DOUBLE PRECISION NOT NULL,
    "frequency_min" DOUBLE PRECISION NOT NULL,
    "frequency_max" DOUBLE PRECISION NOT NULL,
    "motor_rating" DOUBLE PRECISION NOT NULL,
    "design_flow_min" DOUBLE PRECISION NOT NULL,
    "design_flow_max" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_uploads" (
    "id" TEXT NOT NULL,
    "well_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "valid_row_count" INTEGER,
    "invalid_row_count" INTEGER,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "validation_errors" JSONB,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "data_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "id" TEXT NOT NULL,
    "well_id" TEXT NOT NULL,
    "upload_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "liquid_rate" DOUBLE PRECISION,
    "oil_rate" DOUBLE PRECISION,
    "water_cut" DOUBLE PRECISION,
    "gas_rate" DOUBLE PRECISION,
    "gor" DOUBLE PRECISION,
    "intake_pressure" DOUBLE PRECISION,
    "discharge_pressure" DOUBLE PRECISION,
    "annulus_pressure" DOUBLE PRECISION,
    "motor_current" DOUBLE PRECISION,
    "motor_voltage" DOUBLE PRECISION,
    "motor_temperature" DOUBLE PRECISION,
    "pump_speed" DOUBLE PRECISION,
    "frequency" DOUBLE PRECISION,
    "vibration" DOUBLE PRECISION,
    "power_factor" DOUBLE PRECISION,

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "derived_metrics" (
    "id" TEXT NOT NULL,
    "well_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "pump_differential_pressure" DOUBLE PRECISION,
    "pump_head" DOUBLE PRECISION,
    "hydraulic_power" DOUBLE PRECISION,
    "electrical_power" DOUBLE PRECISION,
    "pump_efficiency" DOUBLE PRECISION,
    "production_decline_rate" DOUBLE PRECISION,
    "current_trend" DOUBLE PRECISION,
    "temperature_trend" DOUBLE PRECISION,
    "pressure_trend" DOUBLE PRECISION,
    "liquid_rate_rolling_avg" DOUBLE PRECISION,
    "current_rolling_avg" DOUBLE PRECISION,
    "temp_rolling_avg" DOUBLE PRECISION,
    "liquid_rate_rolling_std" DOUBLE PRECISION,
    "current_rolling_std" DOUBLE PRECISION,
    "rate_of_change_liquid" DOUBLE PRECISION,
    "rate_of_change_current" DOUBLE PRECISION,
    "deviation_from_baseline" JSONB,

    CONSTRAINT "derived_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomalies" (
    "id" TEXT NOT NULL,
    "well_id" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "actual_value" DOUBLE PRECISION NOT NULL,
    "expected_min" DOUBLE PRECISION NOT NULL,
    "expected_max" DOUBLE PRECISION NOT NULL,
    "z_score" DOUBLE PRECISION,
    "severity" "AlertSeverity" NOT NULL,
    "explanation" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failure_predictions" (
    "id" TEXT NOT NULL,
    "well_id" TEXT NOT NULL,
    "health_score" DOUBLE PRECISION NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "failure_probability" DOUBLE PRECISION,
    "predicted_failure_type" TEXT,
    "estimated_failure_window" TEXT,
    "confidence" DOUBLE PRECISION,
    "insufficient_data" BOOLEAN NOT NULL DEFAULT false,
    "missing_data_reason" TEXT,
    "contributing_factors" JSONB NOT NULL,
    "anomaly_summary" JSONB,
    "recommendations" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failure_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "well_id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "fields_user_id_idx" ON "fields"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wells_api_number_key" ON "wells"("api_number");

-- CreateIndex
CREATE INDEX "wells_field_id_idx" ON "wells"("field_id");

-- CreateIndex
CREATE UNIQUE INDEX "esps_well_id_key" ON "esps"("well_id");

-- CreateIndex
CREATE INDEX "data_uploads_well_id_idx" ON "data_uploads"("well_id");

-- CreateIndex
CREATE INDEX "sensor_readings_well_id_timestamp_idx" ON "sensor_readings"("well_id", "timestamp");

-- CreateIndex
CREATE INDEX "sensor_readings_timestamp_idx" ON "sensor_readings"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "sensor_readings_well_id_timestamp_key" ON "sensor_readings"("well_id", "timestamp");

-- CreateIndex
CREATE INDEX "derived_metrics_well_id_timestamp_idx" ON "derived_metrics"("well_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "derived_metrics_well_id_timestamp_key" ON "derived_metrics"("well_id", "timestamp");

-- CreateIndex
CREATE INDEX "anomalies_well_id_timestamp_idx" ON "anomalies"("well_id", "timestamp");

-- CreateIndex
CREATE INDEX "anomalies_well_id_severity_idx" ON "anomalies"("well_id", "severity");

-- CreateIndex
CREATE INDEX "failure_predictions_well_id_analyzed_at_idx" ON "failure_predictions"("well_id", "analyzed_at");

-- CreateIndex
CREATE INDEX "failure_predictions_risk_level_idx" ON "failure_predictions"("risk_level");

-- CreateIndex
CREATE INDEX "alerts_well_id_triggered_at_idx" ON "alerts"("well_id", "triggered_at");

-- CreateIndex
CREATE INDEX "alerts_is_read_idx" ON "alerts"("is_read");

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wells" ADD CONSTRAINT "wells_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esps" ADD CONSTRAINT "esps_well_id_fkey" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_uploads" ADD CONSTRAINT "data_uploads_well_id_fkey" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_well_id_fkey" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "derived_metrics" ADD CONSTRAINT "derived_metrics_well_id_fkey" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_well_id_fkey" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failure_predictions" ADD CONSTRAINT "failure_predictions_well_id_fkey" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_well_id_fkey" FOREIGN KEY ("well_id") REFERENCES "wells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

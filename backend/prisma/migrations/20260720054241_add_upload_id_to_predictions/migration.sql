-- AlterTable
ALTER TABLE "failure_predictions" ADD COLUMN     "upload_id" TEXT;

-- CreateIndex
CREATE INDEX "failure_predictions_well_id_upload_id_idx" ON "failure_predictions"("well_id", "upload_id");

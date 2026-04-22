-- CreateEnum
CREATE TYPE "PayoutTransferFeeTreatment" AS ENUM ('PLATFORM_EXPENSE', 'DEDUCT_FROM_PRACTITIONER');

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN     "vatRatePercentSnapshot" DECIMAL(5,2),
ADD COLUMN     "vatAmountSnapshot" DECIMAL(18,2),
ADD COLUMN     "gatewayFeeRatePercentSnapshot" DECIMAL(5,2),
ADD COLUMN     "gatewayFeeFixedAmountSnapshot" DECIMAL(18,2),
ADD COLUMN     "gatewayFeeAmountSnapshot" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Refund"
ADD COLUMN     "metadataJson" JSONB;

-- AlterTable
ALTER TABLE "PractitionerSettlementPayout"
ADD COLUMN     "transferFeeAmount" DECIMAL(18,2),
ADD COLUMN     "transferFeeTreatment" "PayoutTransferFeeTreatment" NOT NULL DEFAULT 'PLATFORM_EXPENSE';

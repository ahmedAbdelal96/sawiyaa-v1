-- A settlement belongs to one immutable source review. Keep every existing
-- settlement/payout unchanged while allowing later reviews in the same month.
DROP INDEX IF EXISTS "PractitionerSettlement_batchId_practitionerId_key";
CREATE INDEX IF NOT EXISTS "PractitionerSettlement_batchId_practitionerId_idx"
ON "PractitionerSettlement" ("batchId", "practitionerId");

-- Validate historical rows separately; new writes must conserve money now.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_money_conservation_ck"
CHECK ("amountSubtotal" >= 0 AND "amountDiscount" >= 0 AND "amountTotal" >= 0
AND "amountFromWallet" >= 0 AND "amountFromGateway" >= 0
AND "amountSubtotal" - "amountDiscount" = "amountTotal"
AND "amountFromWallet" + "amountFromGateway" = "amountTotal") NOT VALID;
ALTER TABLE "CustomerWallet" ADD CONSTRAINT "CustomerWallet_nonnegative_ck"
CHECK ("availableBalance" >= 0 AND "reservedBalance" >= 0) NOT VALID;
ALTER TABLE "PractitionerSettlement" ADD CONSTRAINT "PractitionerSettlement_paid_bounds_ck"
CHECK ("amountPaidTotal" >= 0 AND "amountPaidTotal" <= "amountNet") NOT VALID;

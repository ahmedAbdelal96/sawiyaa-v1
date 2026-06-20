BEGIN;

ALTER TABLE "Session"
ADD CONSTRAINT "Session_durationMinutes_30_60_chk"
CHECK ("durationMinutes" IN (30, 60));

ALTER TABLE "Session"
ADD CONSTRAINT "Session_scheduled_range_chk"
CHECK (
  "scheduledStartAt" IS NULL
  OR "scheduledEndAt" IS NULL
  OR "scheduledStartAt" < "scheduledEndAt"
);

ALTER TABLE "AvailabilitySlot"
ADD CONSTRAINT "AvailabilitySlot_minute_range_chk"
CHECK (
  "startMinuteOfDay" >= 0
  AND "endMinuteOfDay" <= 1440
  AND "startMinuteOfDay" < "endMinuteOfDay"
);

ALTER TABLE "AvailabilitySlot"
ADD CONSTRAINT "AvailabilitySlot_durationMinutes_30_60_chk"
CHECK ("durationMinutes" IN (30, 60));

ALTER TABLE "AvailabilitySlot"
ADD CONSTRAINT "AvailabilitySlot_effective_range_chk"
CHECK (
  "effectiveFrom" IS NULL
  OR "effectiveTo" IS NULL
  OR "effectiveFrom" <= "effectiveTo"
);

ALTER TABLE "AvailabilityException"
ADD CONSTRAINT "AvailabilityException_utc_range_chk"
CHECK ("startsAtUtc" < "endsAtUtc");

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_amounts_non_negative_chk"
CHECK (
  "amountSubtotal" >= 0
  AND "amountDiscount" >= 0
  AND "amountTotal" >= 0
  AND "amountFromWallet" >= 0
  AND "amountFromGateway" >= 0
);

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_currencyCode_supported_chk"
CHECK ("currencyCode" IN ('EGP', 'USD'));

ALTER TABLE "Refund"
ADD CONSTRAINT "Refund_amount_positive_chk"
CHECK ("amount" > 0);

ALTER TABLE "Refund"
ADD CONSTRAINT "Refund_currencyCode_supported_chk"
CHECK ("currencyCode" IN ('EGP', 'USD'));

ALTER TABLE "CustomerWallet"
ADD CONSTRAINT "CustomerWallet_balances_non_negative_chk"
CHECK (
  "availableBalance" >= 0
  AND "reservedBalance" >= 0
  AND "lifetimeCredited" >= 0
  AND "lifetimeDebited" >= 0
);

ALTER TABLE "CustomerWallet"
ADD CONSTRAINT "CustomerWallet_currencyCode_supported_chk"
CHECK ("currencyCode" IN ('EGP', 'USD'));

ALTER TABLE "CustomerWalletEntry"
ADD CONSTRAINT "CustomerWalletEntry_amount_positive_chk"
CHECK ("amount" > 0);

ALTER TABLE "CustomerWalletEntry"
ADD CONSTRAINT "CustomerWalletEntry_currencyCode_supported_chk"
CHECK ("currencyCode" IN ('EGP', 'USD'));

COMMIT;

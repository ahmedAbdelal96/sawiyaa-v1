-- Read-only verification snippets for standardized package flow staging checks.
-- Replace placeholder values before running.
-- These queries are intentionally SELECT-only.

-- 1) Package plans: verify exact standardized tiers.
SELECT
  "code",
  "sessionCount",
  "discountPercent",
  "isActive",
  "sortOrder",
  "title",
  "description"
FROM "PackagePlan"
ORDER BY "sortOrder", "code";

-- 2) Package config: verify enabled and purchaseEnabled values.
SELECT
  ck."key" AS config_key,
  cv."scopeType",
  cv."scopeRefId",
  cv."valueBoolean",
  cv."isActive",
  cv."priority",
  cv."effectiveFrom",
  cv."effectiveTo"
FROM "ConfigKeyCatalog" ck
JOIN "ConfigValue" cv ON cv."configKeyId" = ck.id
WHERE ck."key" IN ('packages.enabled', 'packages.purchaseEnabled')
ORDER BY ck."key", cv."priority" DESC, cv."createdAt" DESC;

-- 3) Practitioner pricing: verify explicit dual-currency prices exist.
SELECT
  "id",
  "publicSlug",
  "status",
  "isPublicProfilePublished",
  "acceptsPackages",
  "sessionPrice30Egp",
  "sessionPrice30Usd",
  "sessionPrice60Egp",
  "sessionPrice60Usd"
FROM "PractitionerProfile"
WHERE "publicSlug" = '<practitioner-slug>';

-- 4) Patient package purchase summary.
SELECT
  "id",
  "status",
  "packagePlanId",
  "planIdSnapshot",
  "planCodeSnapshot",
  "sessionCountSnapshot",
  "discountPercentSnapshot",
  "currencyCodeSnapshot",
  "selectedBaseSessionPriceSnapshot",
  "undiscountedTotalSnapshot",
  "discountAmountSnapshot",
  "patientPayableTotalSnapshot",
  "paymentId",
  "paymentInitiatedAt",
  "paymentExpiresAt",
  "paidAt",
  "activatedAt",
  "completedAt",
  "expiredAt",
  "cancelledAt"
FROM "PatientPackagePurchase"
WHERE "id" = '<purchase-id>';

-- 5) Linked package sessions.
SELECT
  "id",
  "sessionCode",
  "status",
  "packagePurchaseId",
  "packageSessionIndex",
  "packageSessionCount",
  "paymentCoverageType",
  "scheduledStartAt",
  "scheduledEndAt",
  "joinOpenAt",
  "expiresAt",
  "completedAt",
  "expiredAt",
  "cancelledAt"
FROM "Session"
WHERE "packagePurchaseId" = '<purchase-id>'
ORDER BY "packageSessionIndex";

-- 6) Payment record: verify package payment purpose and capture fields.
SELECT
  "id",
  "paymentPurpose",
  "provider",
  "status",
  "amountSubtotal",
  "amountDiscount",
  "amountTotal",
  "currencyCode",
  "sessionId",
  "patientId",
  "practitionerId",
  "providerPaymentRef",
  "providerOrderRef",
  "providerCustomerRef",
  "initiatedAt",
  "authorizedAt",
  "capturedAt",
  "failedAt",
  "cancelledAt",
  "expiredAt",
  "metadataJson"
FROM "Payment"
WHERE "id" = '<payment-id>';

-- 7) Payment events: verify the initiation / capture / webhook timeline.
SELECT
  "id",
  "paymentId",
  "eventType",
  "providerEventRef",
  "createdAt",
  "payloadJson"
FROM "PaymentEvent"
WHERE "paymentId" = '<payment-id>'
ORDER BY "createdAt" ASC;

-- 8) Ledger entries for a completed package-linked session.
SELECT
  "id",
  "entryType",
  "direction",
  "amount",
  "currencyCode",
  "balanceBucket",
  "practitionerId",
  "sessionId",
  "paymentId",
  "referenceType",
  "referenceId",
  "metadataJson",
  "createdAt"
FROM "LedgerEntry"
WHERE "sessionId" = '<session-id>'
ORDER BY "createdAt" ASC;

-- 9) Detect duplicate package ledger entries.
SELECT
  "referenceType",
  "referenceId",
  "entryType",
  COUNT(*) AS row_count
FROM "LedgerEntry"
WHERE "referenceType" = 'package-session-allocation'
GROUP BY "referenceType", "referenceId", "entryType"
HAVING COUNT(*) > 1;

-- 10) Detect package purchases that are still pending after payment capture.
SELECT
  p."id",
  p."status",
  p."paymentPurpose",
  p."amountTotal",
  p."currencyCode",
  p."capturedAt",
  p."paymentId"
FROM "Payment" p
WHERE p."paymentPurpose" = 'SESSION_PACKAGE_PURCHASE'
  AND p."status" = 'CAPTURED'
  AND NOT EXISTS (
    SELECT 1
    FROM "PatientPackagePurchase" pp
    WHERE pp."paymentId" = p."id"
      AND pp."status" IN ('ACTIVE', 'COMPLETED')
  );

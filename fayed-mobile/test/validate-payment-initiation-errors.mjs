import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

const sessionPayPath = path.join(root, "app/(patient)/sessions/[id]/pay.tsx");
const packagePayPath = path.join(
  root,
  "src/features/patient/package-plans/components/PackagePurchasePayScreen.tsx",
);
const helperPath = path.join(
  root,
  "src/features/patient/payments/payment-initiation-errors.ts",
);
const enPath = path.join(root, "src/i18n/locales/en.json");
const arPath = path.join(root, "src/i18n/locales/ar.json");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function fail(message) {
  throw new Error(message);
}

const sessionSource = read(sessionPayPath);
const packageSource = read(packagePayPath);
const helperSource = read(helperPath);
const enSource = read(enPath);
const arSource = read(arPath);

if (sessionSource.includes("setFlowError(extractApiErrorMessage(")) {
  fail("Session payment initiation must not surface raw API error text to patients.");
}

if (sessionSource.includes("toPatientSafePaymentError(")) {
  fail("Session payment initiation should not attempt to preserve raw backend text.");
}

if (packageSource.includes("setLocalError(apiErrorMessage)")) {
  fail("Package payment initiation must not surface raw API error text to patients.");
}

if (!packageSource.includes('t("packagePurchases.pay.openFailed"')) {
  fail("Package payment initiation must use friendly fallback copy for checkout failures.");
}

if (!packageSource.includes("isInvalidPaymentReturnUrlError(error)")) {
  fail("Package payment initiation should classify invalid return URL errors without exposing raw text.");
}

if (!helperSource.includes("logPaymentInitiationError")) {
  fail("Shared payment initiation error helper must log development-only diagnostics.");
}

if (!helperSource.includes("isInvalidPaymentReturnUrlError")) {
  fail("Shared payment initiation error helper must detect invalid return URL errors.");
}

if (!enSource.includes('"requestFailed": "We couldn\'t confirm payment right now. Please try again."')) {
  fail("English payment retry copy is missing.");
}

if (!arSource.includes('"requestFailed": "تعذر تأكيد الدفع حالياً. يرجى المحاولة مرة أخرى."')) {
  fail("Arabic payment retry copy is missing.");
}

if (enSource.includes("أكملي") || arSource.includes("أكملي")) {
  fail("Payment copy must stay neutral and not gendered.");
}

console.log("[validate-payment-initiation-errors] ok");

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const modalPath = path.join(
  root,
  "src/features/package-plans/components/PackagePurchaseFlowModal.tsx",
);
const actionPath = path.join(
  root,
  "src/features/package-plans/components/PackagePurchasePaymentAction.tsx",
);
const typesPath = path.join(
  root,
  "src/features/package-plans/types/package-purchases.types.ts",
);

const modalSource = fs.readFileSync(modalPath, "utf8");
const actionSource = fs.readFileSync(actionPath, "utf8");
const typesSource = fs.readFileSync(typesPath, "utf8");

function fail(message) {
  throw new Error(message);
}

for (const [name, source] of [
  ["flow modal", modalSource],
  ["payment action", actionSource],
]) {
  if (!source.includes("returnUrl: typeof window !== \"undefined\" ? window.location.href : undefined")) {
    fail(`Package ${name} must pass the current surface URL to the backend.`);
  }

  if (source.includes("window.open(")) {
    fail(`Package ${name} must not use popup checkout flow.`);
  }
}

if (!typesSource.includes("returnUrl?: string;")) {
  fail("Package purchase payment input type must include returnUrl.");
}

console.log("[validate-package-payment-return] ok");

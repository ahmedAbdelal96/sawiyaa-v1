import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const payScreenPath = path.join(
  root,
  "src/features/patient/package-plans/components/PackagePurchasePayScreen.tsx",
);
const typesPath = path.join(
  root,
  "src/features/patient/package-plans/types.ts",
);
const layoutPath = path.join(root, "app/(patient)/_layout.tsx");

const payScreenSource = fs.readFileSync(payScreenPath, "utf8");
const typesSource = fs.readFileSync(typesPath, "utf8");
const layoutSource = fs.readFileSync(layoutPath, "utf8");

function fail(message) {
  throw new Error(message);
}

if (!payScreenSource.includes("window.location.origin")) {
  fail("Package payment screen must derive the return URL from the current caller surface origin on web.");
}

if (!payScreenSource.includes("Linking.createURL(")) {
  fail("Package payment screen must derive the return URL with a deep link on native.");
}

if (!payScreenSource.includes("WebBrowser.openAuthSessionAsync")) {
  fail("Package payment screen must open Paymob checkout through an auth session on native.");
}

if (!payScreenSource.includes("returnUrl: paymentReturnUrl")) {
  fail("Package payment initiation must send returnUrl to the backend.");
}

if (payScreenSource.includes("Linking.openURL")) {
  fail("Package payment screen must not use Linking.openURL for hosted checkout.");
}

if (payScreenSource.includes("window.open(")) {
  fail("Package payment screen must not use popup windows for checkout.");
}

if (typesSource.includes("returnUrl?: string;") === false) {
  fail("Package payment input type must include returnUrl.");
}

if (
  !layoutSource.includes('name="package-purchases/[id]/pay"') ||
  !layoutSource.includes("href: null")
) {
  fail("Patient tabs layout must keep package payment routes hidden.");
}

console.log("[validate-package-payment-return] ok");

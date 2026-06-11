import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const panelPath = path.join(root, "src/features/payments/components/PaySessionPanel.tsx");
const typesPath = path.join(root, "src/features/payments/types/payments.types.ts");
const panelSource = fs.readFileSync(panelPath, "utf8");
const typesSource = fs.readFileSync(typesPath, "utf8");

function fail(message) {
  throw new Error(message);
}

if (!panelSource.includes("window.location.origin")) {
  fail("Web session payment panel must build the return URL from the current browser origin.");
}

if (panelSource.includes("NEXT_PUBLIC_APP_URL")) {
  fail("Web session payment panel must not rely on NEXT_PUBLIC_APP_URL for session return URLs.");
}

if (!panelSource.includes("returnUrl:")) {
  fail("Web session payment panel must send returnUrl when starting Paymob checkout.");
}

if (!typesSource.includes("returnUrl?: string;")) {
  fail("Session payment input type must include returnUrl for caller-surface-aware return handling.");
}

console.log("[validate-session-payment-return] ok");

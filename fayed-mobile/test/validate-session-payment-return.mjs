import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const sessionPayPath = path.join(root, "app/(patient)/sessions/[id]/pay.tsx");
const tabsLayoutPath = path.join(root, "app/(patient)/_layout.tsx");
const sessionPaySource = fs.readFileSync(sessionPayPath, "utf8");
const tabsLayoutSource = fs.readFileSync(tabsLayoutPath, "utf8");

function fail(message) {
  throw new Error(message);
}

if (!sessionPaySource.includes("window.location.origin")) {
  fail("Mobile session payment flow must use the current web origin for Expo Web return URLs.");
}

if (
  !sessionPaySource.includes("const sessionReturnUrl = useMemo(() => {") ||
  !sessionPaySource.includes("Linking.createURL(paymentReturnPath") ||
  !sessionPaySource.includes('scheme: "fayed"')
) {
  fail("Mobile session payment flow must keep the native deep-link return URL.");
}

if (sessionPaySource.includes("http://localhost:3000")) {
  fail("Mobile session payment flow must not hardcode localhost:3000.");
}

if (
  !tabsLayoutSource.includes('name="sessions/[id]/payment-return"') ||
  !tabsLayoutSource.includes("options={{ href: null }}")
) {
  fail("Patient tabs layout must keep session payment-return hidden from bottom tabs.");
}

console.log("[validate-session-payment-return] ok");

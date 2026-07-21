import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const frontendRoot = resolve(__dirname, "..");
const packageRoot = "src/features/package-plans";
const publicSurface = `${packageRoot}/components/PackagePlansSection.tsx`;
const quoteSurface = `${packageRoot}/components/PackagePurchaseFlowModal.tsx`;
const purchaseSurfaces = [
  `${packageRoot}/components/PatientPackagePurchasesPanel.tsx`,
  `${packageRoot}/components/PatientPackagePurchaseDetailPanel.tsx`,
  `${packageRoot}/components/PackagePurchasePaymentAction.tsx`,
];
const packageRequestFiles = [
  `${packageRoot}/api/package-plans.api.ts`,
  `${packageRoot}/api/package-purchases.api.ts`,
];
const forbiddenCustomerPricing = [
  "package-plan-pricing",
  "priceEgp",
  "priceUsd",
  "formatLocalizedMoney",
  "Intl.NumberFormat",
  "currencyCode ?? \"USD\"",
  "currencyCode || \"USD\"",
];
const forbiddenRequestAuthority = [
  "requestedCurrencyCode",
  "selectedCurrencyCode:",
  "requestedCurrency:",
  "checkoutCountryIsoCode:",
  "regionalPricingMode:",
];

function source(relativePath: string) {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

test("customer package UI only renders selected backend or persisted snapshot money", () => {
  expect(existsSync(resolve(frontendRoot, `${packageRoot}/lib/package-plan-pricing.ts`))).toBeFalsy();

  const publicSource = source(publicSurface);
  expect(publicSource).toContain("mapPackagePublicPrice");
  expect(publicSource).toContain("<PriceDisplay");

  const quoteSource = source(quoteSurface);
  expect(quoteSource).toContain("mapPackageQuoteMoney");
  expect(quoteSource).toContain("<MoneyText");
  expect(quoteSource).not.toMatch(/<select[^>]*currency|currency[^\n]*<select/i);

  for (const relativePath of purchaseSurfaces) {
    const componentSource = source(relativePath);
    expect(componentSource).toContain("mapPackagePurchaseSnapshotMoney");
    expect(componentSource).toContain("<MoneyText");
  }
  expect(source(`${packageRoot}/components/PackagePurchasePaymentAction.tsx`)).toContain(
    "mapPackagePaymentSnapshotMoney",
  );

  for (const relativePath of [publicSurface, quoteSurface, ...purchaseSurfaces]) {
    const componentSource = source(relativePath);
    for (const pattern of forbiddenCustomerPricing) {
      expect(componentSource).not.toContain(pattern);
    }
  }
});

test("package requests cannot supply pricing authority", () => {
  for (const relativePath of packageRequestFiles) {
    const requestSource = source(relativePath);
    for (const pattern of forbiddenRequestAuthority) {
      expect(requestSource).not.toContain(pattern);
    }
  }
});

test("central package money adapters reject invalid or unavailable selected money", () => {
  const moneySource = source(`${packageRoot}/lib/package-money.ts`);
  expect(moneySource).toContain("mapPackagePublicPrice");
  expect(moneySource).toContain('status: "UNAVAILABLE"');
  expect(moneySource).toContain("Number(money.amount) > 0");
  expect(moneySource).toContain("mapPackageQuoteMoney");
  expect(moneySource).toContain("mapPackagePurchaseSnapshotMoney");
  expect(moneySource).toContain("mapPackagePaymentSnapshotMoney");
});

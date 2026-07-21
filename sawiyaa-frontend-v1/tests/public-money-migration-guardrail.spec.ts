import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const frontendRoot = resolve(__dirname, "..");
const academyScreens = [
  "src/features/academy/components/PublicAcademyHomeScreen.tsx",
  "src/features/academy/components/PublicAcademyDetailScreen.tsx",
];
const filterControls = "src/features/practitioners-discovery/components/FilterControls.tsx";
const forbiddenAcademyPatterns = [
  "formatAcademyProgramPrice",
  "formatPublicMoney",
  "formatLocalizedMoney",
  "currencyCode ?? \"USD\"",
  "currencyCode || \"USD\"",
  "priceEgp",
  "priceUsd",
  "$US",
  "SUS",
  "USD$",
];

test("public Academy price surfaces use PriceDisplay rather than local formatting", () => {
  for (const relativePath of academyScreens) {
    const source = readFileSync(resolve(frontendRoot, relativePath), "utf8");
    expect(source).toContain("<PriceDisplay");
    for (const pattern of forbiddenAcademyPatterns) {
      expect(source).not.toContain(pattern);
    }
    expect(source).not.toMatch(/style:\s*["']currency["']/);
  }
});

test("practitioner filters use MoneyText and never choose a currency locally", () => {
  const source = readFileSync(resolve(frontendRoot, filterControls), "utf8");
  expect(source).toContain("<MoneyText");
  for (const pattern of forbiddenAcademyPatterns) {
    expect(source).not.toContain(pattern);
  }
  expect(source).not.toMatch(/currencyCode\s*===|currency\s*===/);
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const PRACTITIONER_PATIENT_SURFACES = [
  "app/(patient)/index.tsx",
  "app/(patient)/discovery/[slug].tsx",
  "src/features/patient/discovery/components/TherapistCard.tsx",
  "src/features/patient/discovery/components/PractitionerCompactCard.tsx",
  "src/features/patient/journey/components/SpecialistCompactCard.tsx",
  "src/features/patient/journey/components/SpecialistHorizontalRail.tsx",
] as const;

const FORBIDDEN_PRACTITIONER_MONEY = /Intl\.NumberFormat\([\s\S]*?(?:style:\s*["']currency|currency:)|sessionPrice(?:30|60)(?:Egp|Usd)|currencyCode\s*(?:\?\?|\|\|)\s*["']USD["']|regionalPricingMode|resolvedCountryIsoCode|(?:\$\s*\{[^}]+\}\s*USD)/;

describe("patient price presentation guardrails", () => {
  it("does not retain Academy's legacy raw-region or zero-is-free decision path", () => {
    const academy = [
      "src/features/patient/academy/components/AcademyBrowseScreen.tsx",
      "src/features/patient/academy/components/AcademyDetailScreen.tsx",
      "src/features/patient/academy/components/AcademyEnrollmentCreateScreen.tsx",
    ].map(read).join("\n");
    expect(academy).not.toMatch(/priceEgp|priceUsd|isAcademyProgramFree|registerFree/);
    expect(academy).toContain("academyPriceOf");
    expect(academy).toContain("PriceDisplay");
  });

  it("keeps client package requests free of currency-selection fields", () => {
    const types = read("src/features/patient/package-plans/types.ts");
    const create = read("src/features/patient/package-plans/components/PackagePurchaseCreateScreen.tsx");
    expect(types).not.toMatch(/PackagePlansQuery\s*=\s*\{[^}]*currencyCode/);
    expect(types).not.toMatch(/PatientPackagePlanQuoteRequest\s*=\s*\{[^}]*currencyCode/);
    expect(create).not.toContain("practitioner?.currencyCode");
  });

  it("keeps every active patient practitioner surface on the central money display path", () => {
    const sources = PRACTITIONER_PATIENT_SURFACES.map(read).join("\n");
    expect(sources).not.toMatch(FORBIDDEN_PRACTITIONER_MONEY);
    expect(read("src/features/patient/discovery/components/TherapistCard.tsx")).toContain("PriceDisplay");
    expect(read("src/features/patient/discovery/components/PractitionerCompactCard.tsx")).toContain("PriceDisplay");
    expect(read("src/features/patient/journey/components/SpecialistCompactCard.tsx")).toContain("PriceDisplay");
  });

  it("detects a forbidden local practitioner currency formatter fixture", () => {
    const forbiddenFixture = 'new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode })';
    expect(forbiddenFixture).toMatch(FORBIDDEN_PRACTITIONER_MONEY);
  });
});

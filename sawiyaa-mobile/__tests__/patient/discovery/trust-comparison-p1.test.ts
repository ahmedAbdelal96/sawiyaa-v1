import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mobileRoot = resolve(__dirname, "../../..");

function read(relativePath: string) {
  return readFileSync(resolve(mobileRoot, relativePath), "utf8");
}

describe("trust and comparison P1 contract", () => {
  it("keeps compact discovery language rendering list-projection only", () => {
    const card = read("src/features/patient/discovery/components/PractitionerCompactCard.tsx");
    expect(card).toContain("const languageSummary = practitioner.languages");
    expect(card).toContain(".slice(0, 2)");
    expect(card).toContain("additionalLanguageCount");
    expect(card).not.toContain("useGetPublicPractitionerDetails");
  });

  it("does not render unsupported credential fallbacks on either profile route", () => {
    for (const route of [
      "app/(public)/discovery/[slug].tsx",
      "app/(patient)/discovery/[slug].tsx",
    ]) {
      const profile = read(route);
      expect(profile).not.toContain("approvedCredentials");
      expect(profile).not.toContain("?? 1");
      expect(profile).not.toContain("?? 15");
    }
  });

  it("keeps patient online presence distinct from instant eligibility", () => {
    const profile = read("app/(patient)/discovery/[slug].tsx");
    expect(profile).toContain("isInstantAvailable");
    expect(profile).toContain("isPresenceAvailable");
    expect(profile).toContain('t("discovery.profile.presence.online")');
    expect(profile).toContain("Available now");
  });

  it("keeps the public profile instant CTA behind authoritative availability", () => {
    const profile = read("app/(public)/discovery/[slug].tsx");
    expect(profile).toContain("useGetPublicPractitionerInstantBookingAvailability");
    expect(profile).toContain("isInstantAvailable");
    expect(profile).toContain("{isInstantAvailable ? (");
  });
});

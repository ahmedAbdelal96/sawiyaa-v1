import { describe, expect, it } from "vitest";
import {
  mapBackendListItemToUi,
  type BackendPublicPractitionerListItem,
} from "./practitioners-ssr.api";

function buildItem(professionalTitle: string, bioSnippet: string): BackendPublicPractitionerListItem {
  return {
    slug: "same-practitioner",
    displayName: "Dr. Same Name",
    professionalTitle,
    bioSnippet,
    specialties: [{ slug: "anxiety" }],
    languages: ["ar", "en"],
    countryCode: "EG",
    currencyCode: "EGP",
    regionalPricingMode: "EGYPT_LOCAL",
    resolvedCountryIsoCode: "EG",
    practitionerType: "THERAPIST",
    practitionerGender: null,
    sessionPrice30: 300,
    sessionPrice60: 500,
    sessionPrice30Egp: 300,
    sessionPrice30Usd: null,
    sessionPrice60Egp: 500,
    sessionPrice60Usd: null,
    instantBookingPrice30Egp: null,
    instantBookingPrice30Usd: null,
    instantBookingPrice60Egp: null,
    instantBookingPrice60Usd: null,
    displaySessionPrice30: 300,
    displaySessionPrice60: 500,
    isOnlineNow: false,
    acceptsCoupon: false,
    acceptsPackage: false,
    yearsExperience: 8,
    ratingSummary: { averageRating: 4.8, totalReviews: 12 },
    isVerified: true,
    avatarUrl: null,
  };
}

describe("public practitioner localized read mapping", () => {
  it("trusts the backend-resolved title and keeps the stable identity across locales", () => {
    const arabic = mapBackendListItemToUi(
      buildItem("أخصائي نفسي إكلينيكي", "نبذة عربية مكتوبة يدويًا"),
    );
    const english = mapBackendListItemToUi(
      buildItem("Clinical Psychologist", "Manually authored English bio"),
    );

    expect(arabic).toEqual(
      expect.objectContaining({
        id: "same-practitioner",
        slug: "same-practitioner",
        professionalTitle: "أخصائي نفسي إكلينيكي",
        bioSnippet: "نبذة عربية مكتوبة يدويًا",
      }),
    );
    expect(english).toEqual(
      expect.objectContaining({
        id: "same-practitioner",
        slug: "same-practitioner",
        professionalTitle: "Clinical Psychologist",
        bioSnippet: "Manually authored English bio",
      }),
    );
  });
});

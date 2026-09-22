import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import PractitionerCard from "./PractitionerCard";
import { getPublicSessionPrices } from "../lib/public-pricing";
import { mapPractitionerDurationMoney } from "../lib/practitioner-price";
import type { PublicPractitioner } from "../types/practitioner";
import arListingMessages from "@/../messages/ar/practitioners-listing.json";
import enListingMessages from "@/../messages/en/practitioners-listing.json";
import arCommonMessages from "@/../messages/ar/common.json";
import enCommonMessages from "@/../messages/en/common.json";

function buildMockPractitioner(overrides: Partial<PublicPractitioner>): PublicPractitioner {
  return {
    id: "dr-test-practitioner",
    slug: "dr-test-practitioner",
    nameAr: "د. سارة أحمد",
    nameEn: "Dr. Sarah Ahmed",
    professionalTitle: "أخصائي نفسي إكلينيكي",
    titleAr: "أخصائي نفسي إكلينيكي",
    titleEn: "Clinical Psychologist",
    bioSnippet: "نبذة عن المختص",
    specialties: ["anxiety", "depression"],
    languages: ["ar", "en"],
    country: "eg",
    currencyCode: "EGP",
    regionalPricingMode: "EGYPT_LOCAL",
    resolvedCountryIsoCode: "EG",
    practitionerType: "THERAPIST",
    practitionerGender: "female",
    sessionPrice30: 400,
    sessionPrice60: 800,
    sessionPrice30Egp: 400,
    sessionPrice30Usd: 20,
    sessionPrice60Egp: 800,
    sessionPrice60Usd: 40,
    instantBookingPrice30Egp: null,
    instantBookingPrice30Usd: null,
    instantBookingPrice60Egp: null,
    instantBookingPrice60Usd: null,
    displaySessionPrice30: 400,
    displaySessionPrice60: 800,
    pricing: {
      session30: { egp: 400, usd: 20 },
      session60: { egp: 800, usd: 40 },
    },
    isOnlineNow: false,
    availableNow: false,
    isInstantBookingAvailable: false,
    acceptsCoupon: false,
    acceptsPackage: false,
    rating: 4.9,
    reviewCount: 15,
    sessionCount: null,
    yearsExperience: 8,
    isVerified: true,
    initials: "SA",
    avatarUrl: null,
    ...overrides,
  };
}

describe("PractitionerCard Pricing Business Contract", () => {
  describe("1. Pricing Helper Functions", () => {
    it("extracts both 30-min and 60-min prices when present", () => {
      const p = buildMockPractitioner({ sessionPrice30: 400, sessionPrice60: 800 });
      const prices = getPublicSessionPrices(p);

      expect(prices).toEqual([
        { duration: 30, amount: 400 },
        { duration: 60, amount: 800 },
      ]);
    });

    it("maps duration money with the authoritative currencyCode (EGP)", () => {
      const money = mapPractitionerDurationMoney({ amount: 400, currencyCode: "EGP" });
      expect(money).toEqual({
        amount: "400",
        currencyCode: "EGP",
      });
    });

    it("maps duration money with the authoritative currencyCode (USD)", () => {
      const money = mapPractitionerDurationMoney({ amount: 25, currencyCode: "USD" });
      expect(money).toEqual({
        amount: "25",
        currencyCode: "USD",
      });
    });
  });

  describe("2. EGP Context Rendering (Egypt Local)", () => {
    it("renders both 30-min (400 EGP) and 60-min (800 EGP) in Arabic", () => {
      const practitioner = buildMockPractitioner({
        currencyCode: "EGP",
        sessionPrice30: 400,
        sessionPrice60: 800,
      });

      render(
        <NextIntlClientProvider
          locale="ar"
          messages={{
            "practitioners-listing": arListingMessages,
            common: arCommonMessages,
          }}
        >
          <PractitionerCard
            practitioner={practitioner}
            specialtyLabels={{ anxiety: "القلق والتوتر", depression: "الاكتئاب" }}
            languageLabels={{ ar: "العربية", en: "الإنجليزية" }}
          />
        </NextIntlClientProvider>
      );

      // Verify both duration labels exist
      expect(screen.getByText("30 دقيقة")).toBeDefined();
      expect(screen.getByText("60 دقيقة")).toBeDefined();

      // Verify 400 and 800 amounts are rendered
      expect(screen.getByText(/400/)).toBeDefined();
      expect(screen.getByText(/800/)).toBeDefined();
    });

    it("renders both 30-min and 60-min in English when locale is en", () => {
      const practitioner = buildMockPractitioner({
        currencyCode: "EGP",
        sessionPrice30: 400,
        sessionPrice60: 800,
      });

      render(
        <NextIntlClientProvider
          locale="en"
          messages={{
            "practitioners-listing": enListingMessages,
            common: enCommonMessages,
          }}
        >
          <PractitionerCard
            practitioner={practitioner}
            specialtyLabels={{ anxiety: "Anxiety", depression: "Depression" }}
            languageLabels={{ ar: "Arabic", en: "English" }}
          />
        </NextIntlClientProvider>
      );

      expect(screen.getByText("30 min")).toBeDefined();
      expect(screen.getByText("60 min")).toBeDefined();
      expect(screen.getByText(/400/)).toBeDefined();
      expect(screen.getByText(/800/)).toBeDefined();
    });
  });

  describe("3. USD Context Rendering (International)", () => {
    it("renders both 30-min ($25) and 60-min ($50) in Arabic", () => {
      const practitioner = buildMockPractitioner({
        currencyCode: "USD",
        sessionPrice30: 25,
        sessionPrice60: 50,
      });

      render(
        <NextIntlClientProvider
          locale="ar"
          messages={{
            "practitioners-listing": arListingMessages,
            common: arCommonMessages,
          }}
        >
          <PractitionerCard
            practitioner={practitioner}
            specialtyLabels={{ anxiety: "القلق والتوتر", depression: "الاكتئاب" }}
            languageLabels={{ ar: "العربية", en: "الإنجليزية" }}
          />
        </NextIntlClientProvider>
      );

      expect(screen.getByText("30 دقيقة")).toBeDefined();
      expect(screen.getByText("60 دقيقة")).toBeDefined();
      expect(screen.getByText(/25/)).toBeDefined();
      expect(screen.getByText(/50/)).toBeDefined();
    });

    it("renders both 30-min and 60-min in English when locale is en", () => {
      const practitioner = buildMockPractitioner({
        currencyCode: "USD",
        sessionPrice30: 25,
        sessionPrice60: 50,
      });

      render(
        <NextIntlClientProvider
          locale="en"
          messages={{
            "practitioners-listing": enListingMessages,
            common: enCommonMessages,
          }}
        >
          <PractitionerCard
            practitioner={practitioner}
            specialtyLabels={{ anxiety: "Anxiety", depression: "Depression" }}
            languageLabels={{ ar: "Arabic", en: "English" }}
          />
        </NextIntlClientProvider>
      );

      expect(screen.getByText("30 min")).toBeDefined();
      expect(screen.getByText("60 min")).toBeDefined();
      expect(screen.getByText(/25/)).toBeDefined();
      expect(screen.getByText(/50/)).toBeDefined();
    });
  });
});

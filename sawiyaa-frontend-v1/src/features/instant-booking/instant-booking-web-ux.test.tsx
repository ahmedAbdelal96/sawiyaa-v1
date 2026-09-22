import { describe, expect, it } from "vitest";
import { resolveNotificationClickTarget } from "@/features/notifications/lib/resolve-notification-click-target";
import { mapBackendListItemToUi } from "@/features/practitioners-discovery/api/practitioners-ssr.api";
import { isProfileInstantBookingAvailable } from "@/features/practitioner-profile/components/ProfileInstantActionCard";

describe("Instant Booking Web UX Requirements", () => {
  describe("1. Practitioner Directory Card Mapping", () => {
    it("maps availableNow from backend authoritative field", () => {
      const mockBackendItem = {
        slug: "dr-karim-hassan",
        displayName: "Dr. Karim Hassan",
        professionalTitle: "PSYCHIATRIST",
        specialties: [{ slug: "anxiety" }],
        languages: ["ar", "en"],
        countryCode: "EG",
        currencyCode: "EGP" as const,
        regionalPricingMode: "EGYPT_LOCAL" as const,
        resolvedCountryIsoCode: "EG",
        practitionerType: "doctor",
        practitionerGender: "male",
        sessionPrice30: 400,
        sessionPrice60: 700,
        sessionPrice30Egp: 400,
        sessionPrice30Usd: 20,
        sessionPrice60Egp: 700,
        sessionPrice60Usd: 35,
        instantBookingPrice30Egp: 500,
        instantBookingPrice30Usd: 25,
        instantBookingPrice60Egp: 900,
        instantBookingPrice60Usd: 45,
        displaySessionPrice30: 400,
        displaySessionPrice60: 700,
        isOnlineNow: true,
        availableNow: true,
        acceptsCoupon: true,
        acceptsPackage: true,
        yearsExperience: 10,
        ratingSummary: { averageRating: 4.9, totalReviews: 24 },
        isVerified: true,
        avatarUrl: null,
      };

      const mapped = mapBackendListItemToUi(mockBackendItem as any);

      expect(mapped.isOnlineNow).toBe(true);
      expect(mapped.availableNow).toBe(true);
      expect(mapped.sessionPrice30).toBe(400); // Scheduled fee remains scheduled fee
      expect(mapped.sessionPrice60).toBe(700);
    });

    it("does not set availableNow when backend reports false even if online", () => {
      const mockBackendItem = {
        slug: "dr-test",
        displayName: "Dr. Test",
        professionalTitle: "THERAPIST",
        specialties: [],
        languages: [],
        countryCode: "EG",
        currencyCode: "EGP" as const,
        regionalPricingMode: "EGYPT_LOCAL" as const,
        resolvedCountryIsoCode: "EG",
        practitionerType: "therapist",
        practitionerGender: "female",
        sessionPrice30: 400,
        sessionPrice60: 700,
        sessionPrice30Egp: 400,
        sessionPrice30Usd: 20,
        sessionPrice60Egp: 700,
        sessionPrice60Usd: 35,
        instantBookingPrice30Egp: null,
        instantBookingPrice30Usd: null,
        instantBookingPrice60Egp: null,
        instantBookingPrice60Usd: null,
        displaySessionPrice30: 400,
        displaySessionPrice60: 700,
        isOnlineNow: true,
        availableNow: false,
        acceptsCoupon: false,
        acceptsPackage: false,
        yearsExperience: 5,
        ratingSummary: { averageRating: 5.0, totalReviews: 10 },
        isVerified: true,
        avatarUrl: null,
      };

      const mapped = mapBackendListItemToUi(mockBackendItem as any);

      expect(mapped.isOnlineNow).toBe(true);
      expect(mapped.availableNow).toBe(false);
    });
  });

  describe("2. Notification Routing for Instant Booking", () => {
    it("routes instant-booking.request-accepted to payment route with createdSessionId", () => {
      const target = resolveNotificationClickTarget({
        item: {
          id: "notif-1",
          typeSlug: "instant-booking.request-accepted",
          action: null,
          payload: {
            createdSessionId: "session-123",
          },
          context: undefined,
          primaryAction: undefined,
        },
        role: "patient",
      });

      expect(target).toEqual({
        kind: "href",
        href: "/patient/sessions/session-123/pay",
      });
    });

    it("routes instant-booking.request-created for practitioner to practitioner request queue", () => {
      const target = resolveNotificationClickTarget({
        item: {
          id: "notif-2",
          typeSlug: "instant-booking.request-created",
          action: null,
          payload: {
            requestId: "req-456",
          },
          context: undefined,
          primaryAction: undefined,
        },
        role: "practitioner",
      });

      expect(target).toEqual({
        kind: "href",
        href: "/practitioner/instant-booking",
      });
    });
  });

  describe("3. Practitioner profile availability", () => {
    it("shows the profile CTA only for a positive backend availability snapshot", () => {
      expect(isProfileInstantBookingAvailable({
        availableNow: true,
        durations: { 30: true, 60: false },
        checkedAt: new Date().toISOString(),
      })).toBe(true);
      expect(isProfileInstantBookingAvailable({
        availableNow: false,
        durations: { 30: false, 60: false },
        checkedAt: new Date().toISOString(),
      })).toBe(false);
      expect(isProfileInstantBookingAvailable(null)).toBe(false);
    });
  });
});

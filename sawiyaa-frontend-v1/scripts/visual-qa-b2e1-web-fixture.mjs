import http from "node:http";

const port = Number(process.env.SAWIYAA_B2E1_WEB_FIXTURE_PORT ?? 7101);

const practitioner = {
  slug: "same-practitioner",
  displayName: "Mona Hassan",
  ar: {
    professionalTitle: "أخصائية نفسية إكلينيكية",
    bio: "تقدم دعمًا نفسيًا هادئًا وعمليًا لمساعدتك على فهم مشاعرك وبناء خطوات أكثر توازنًا.",
  },
  en: {
    professionalTitle: "Clinical Psychologist",
    bio: "Provides calm, practical support to help you understand your feelings and build more balanced next steps.",
  },
};

function localeFrom(request) {
  return request.headers["accept-language"]?.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function item(locale, detail = false) {
  const content = practitioner[locale];
  return {
    slug: practitioner.slug,
    displayName: practitioner.displayName,
    professionalTitle: content.professionalTitle,
    ...(detail ? { fullBio: content.bio, credentialsSummary: { totalCredentials: 2, approvedCredentials: 2 } } : { bioSnippet: content.bio }),
    specialties: [{ slug: "anxiety-support" }],
    languages: ["ar", "en"],
    countryCode: "EG",
    currencyCode: "EGP",
    regionalPricingMode: "EGYPT_LOCAL",
    resolvedCountryIsoCode: "EG",
    practitionerType: "THERAPIST",
    practitionerGender: "female",
    sessionPrice30: 350,
    sessionPrice60: 600,
    sessionPrice30Egp: 350,
    sessionPrice30Usd: null,
    sessionPrice60Egp: 600,
    sessionPrice60Usd: null,
    instantBookingPrice30Egp: 350,
    instantBookingPrice30Usd: null,
    instantBookingPrice60Egp: 600,
    instantBookingPrice60Usd: null,
    displaySessionPrice30: 350,
    displaySessionPrice60: 600,
    isOnlineNow: false,
    acceptsCoupon: false,
    acceptsPackage: false,
    yearsExperience: 8,
    ratingSummary: { averageRating: 4.8, totalReviews: 12 },
    isVerified: true,
    avatarUrl: null,
  };
}

function envelope(data) {
  return JSON.stringify({ success: true, data });
}

function writeJson(response, data) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(envelope(data));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const locale = localeFrom(request);
  const pathname = url.pathname;

  if (pathname.endsWith("/public/practitioners/filters")) {
    return writeJson(response, {
      specialties: [{ value: "anxiety-support", label: locale === "ar" ? "دعم القلق" : "Anxiety support", practitionerCount: 1 }],
      specialtyCategories: [{ value: "anxiety", label: locale === "ar" ? "القلق" : "Anxiety", practitionerCount: 1 }],
      languages: [], countries: [], practitionerKinds: [], genders: [], durations: [], ratingThresholds: [],
      feeBounds: { min: 350, max: 600, actualMin: 350, currency: "EGP", step: 50 },
      availability: { onlineNowSupported: true, availableTodaySupported: false, availableThisWeekSupported: false },
    });
  }

  if (pathname.endsWith("/public/practitioners/same-practitioner")) {
    return writeJson(response, { item: item(locale, true) });
  }

  if (pathname.endsWith("/public/practitioners")) {
    return writeJson(response, { items: [item(locale)], pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 } });
  }

  if (pathname.endsWith("/presence")) return writeJson(response, { presence: { status: "OFFLINE", isInstantBookingEnabled: false, lastSeenAt: null } });
  if (pathname.endsWith("/instant-booking-availability")) return writeJson(response, { availableNow: false, durations: { 30: false, 60: false }, checkedAt: new Date().toISOString() });
  if (pathname.endsWith("/trust-block")) return writeJson(response, { practitioner: { id: "same-practitioner", slug: practitioner.slug, displayName: practitioner.displayName }, summary: { averageOverallRating: 4.8, totalPublicReviews: 12, totalPublishedReviews: 12, totalSubmittedReviews: 12, latestPublishedReviewAt: null, hasEnoughPublicReviews: true, volumeLevel: "ESTABLISHED", freshness: "RECENT", rationaleCodes: [] }, highlightedReviews: [], contentSuggestions: [], compositionMeta: { generatedAt: new Date().toISOString(), reasonCodes: [] } });
  if (pathname.endsWith("/availability/windows")) return writeJson(response, { acceptsNormalBookings: true, timezone: "Africa/Cairo", range: { from: url.searchParams.get("from"), to: url.searchParams.get("to") }, windows: [] });
  if (pathname.endsWith("/package-plans")) return writeJson(response, { items: [] });

  response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ success: false, message: "Not found" }));
});

server.listen(port, "127.0.0.1", () => console.log(`BLOC-2E1 Web visual fixture listening on ${port}`));

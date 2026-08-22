import http from "node:http";

const port = Number(process.env.SAWIYAA_WEB_VISUAL_QA_FIXTURE_PORT ?? 7100);

const categories = [
  { id: "cat-anxiety", slug: "anxiety", nameAr: "القلق", nameEn: "Anxiety", practitionerCount: 2 },
  { id: "cat-family", slug: "family", nameAr: "الأسرة", nameEn: "Family", practitionerCount: 1 },
  { id: "cat-mood", slug: "mood", nameAr: "المزاج", nameEn: "Mood", practitionerCount: 1 },
];

const specialties = [
  { id: "specialty-anxiety", slug: "anxiety-support", categoryId: "cat-anxiety", nameAr: "دعم القلق", nameEn: "Anxiety support", practitionerCount: 2 },
  { id: "specialty-family", slug: "family-support", categoryId: "cat-family", nameAr: "الدعم الأسري", nameEn: "Family support", practitionerCount: 1 },
  { id: "specialty-mood", slug: "mood-support", categoryId: "cat-mood", nameAr: "دعم المزاج", nameEn: "Mood support", practitionerCount: 1 },
];

const practitioners = [
  { slug: "mona-hassan", displayName: "Mona Hassan", professionalTitle: "CLINICAL_PSYCHOLOGIST", specialtySlug: "anxiety-support", countryCode: "EG", practitionerGender: "female", sessionPrice30: 350, sessionPrice60: 600, rating: 4.8, reviewCount: 42, yearsExperience: 8 },
  { slug: "omar-adel", displayName: "Omar Adel", professionalTitle: "MENTAL_HEALTH_COUNSELOR", specialtySlug: "family-support", countryCode: "EG", practitionerGender: "male", sessionPrice30: 300, sessionPrice60: 520, rating: 4.6, reviewCount: 27, yearsExperience: 6 },
  { slug: "layla-nour", displayName: "Layla Nour", professionalTitle: "PSYCHOTHERAPIST", specialtySlug: "mood-support", countryCode: "EG", practitionerGender: "female", sessionPrice30: 400, sessionPrice60: 700, rating: 4.9, reviewCount: 61, yearsExperience: 10 },
];

function localeFrom(request) {
  return request.headers["accept-language"]?.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function localize(value, locale) {
  return locale === "ar" ? value.nameAr : value.nameEn;
}

function localizedCategory(category, locale) {
  return {
    id: category.id,
    slug: category.slug,
    name: localize(category, locale),
    nameAr: category.nameAr,
    nameEn: category.nameEn,
  };
}

function localizedSpecialty(specialty, locale) {
  const category = categories.find((item) => item.id === specialty.categoryId);
  return {
    id: specialty.id,
    slug: specialty.slug,
    name: localize(specialty, locale),
    nameAr: specialty.nameAr,
    nameEn: specialty.nameEn,
    category: category ? localizedCategory(category, locale) : null,
    practitionerCount: specialty.practitionerCount,
  };
}

function practitionerItem(practitioner) {
  return {
    slug: practitioner.slug,
    displayName: practitioner.displayName,
    professionalTitle: practitioner.professionalTitle,
    specialties: [{ slug: practitioner.specialtySlug }],
    languages: ["ar", "en"],
    countryCode: practitioner.countryCode,
    currencyCode: "EGP",
    regionalPricingMode: "EGYPT_LOCAL",
    resolvedCountryIsoCode: "EG",
    practitionerType: "THERAPIST",
    practitionerGender: practitioner.practitionerGender,
    sessionPrice30: practitioner.sessionPrice30,
    sessionPrice60: practitioner.sessionPrice60,
    sessionPrice30Egp: practitioner.sessionPrice30,
    sessionPrice30Usd: null,
    sessionPrice60Egp: practitioner.sessionPrice60,
    sessionPrice60Usd: null,
    displaySessionPrice30: practitioner.sessionPrice30,
    displaySessionPrice60: practitioner.sessionPrice60,
    isOnlineNow: false,
    acceptsCoupon: true,
    acceptsPackage: false,
    yearsExperience: practitioner.yearsExperience,
    ratingSummary: { averageRating: practitioner.rating, totalReviews: practitioner.reviewCount },
    isVerified: true,
    avatarUrl: null,
  };
}

function filterPractitioners(requestUrl) {
  const categorySlug = requestUrl.searchParams.get("specialtyCategorySlug");
  const specialtySlug = requestUrl.searchParams.get("specialtySlug");
  const search = requestUrl.searchParams.get("search")?.toLowerCase() ?? "";
  return practitioners.filter((practitioner) => {
    const specialty = specialties.find((item) => item.slug === practitioner.specialtySlug);
    if (categorySlug && specialty?.categoryId !== categories.find((item) => item.slug === categorySlug)?.id) return false;
    if (specialtySlug && practitioner.specialtySlug !== specialtySlug) return false;
    if (search && !`${practitioner.displayName} ${practitioner.specialtySlug}`.toLowerCase().includes(search)) return false;
    return true;
  });
}

function filtersPayload(locale) {
  const localizedCategories = categories.map((category) => ({
    value: category.slug,
    label: localize(category, locale),
    practitionerCount: category.practitionerCount,
  }));
  const localizedSpecialties = specialties.map((specialty) => {
    const category = categories.find((item) => item.id === specialty.categoryId);
    return {
      ...localizedSpecialty(specialty, locale),
      category: category ? localizedCategory(category, locale) : null,
    };
  });
  return {
    specialties: localizedSpecialties,
    specialtyCategories: localizedCategories,
    languages: [
      { value: "ar", label: locale === "ar" ? "العربية" : "Arabic", practitionerCount: 3 },
      { value: "en", label: locale === "ar" ? "الإنجليزية" : "English", practitionerCount: 3 },
    ],
    countries: [{ value: "EG", label: locale === "ar" ? "مصر" : "Egypt", practitionerCount: 3 }],
    practitionerKinds: [{ value: "therapist", label: locale === "ar" ? "معالج" : "Therapist", practitionerCount: 3 }],
    genders: [
      { value: "female", label: locale === "ar" ? "أنثى" : "Female", practitionerCount: 2 },
      { value: "male", label: locale === "ar" ? "ذكر" : "Male", practitionerCount: 1 },
    ],
    durations: [
      { value: 30, label: locale === "ar" ? "30 دقيقة" : "30 minutes", practitionerCount: 3 },
      { value: 60, label: locale === "ar" ? "60 دقيقة" : "60 minutes", practitionerCount: 3 },
    ],
    ratingThresholds: [{ value: 4, label: "4+", practitionerCount: 3 }],
    feeBounds: { min: 300, max: 700, actualMin: 300, currency: "EGP", step: 50 },
    availability: { onlineNowSupported: true, availableTodaySupported: false, availableThisWeekSupported: false },
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
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const locale = localeFrom(request);
  const pathname = requestUrl.pathname;

  if (pathname.endsWith("/public/practitioners/filters")) return writeJson(response, filtersPayload(locale));
  if (pathname.endsWith("/public/practitioners")) {
    const items = filterPractitioners(requestUrl).map(practitionerItem);
    return writeJson(response, { items, pagination: { page: 1, limit: 12, totalItems: items.length, totalPages: 1 } });
  }
  if (pathname.endsWith("/specialty-categories")) return writeJson(response, { categories: categories.map((category) => localizedCategory(category, locale)) });
  if (pathname.endsWith("/specialties")) return writeJson(response, { specialties: specialties.map((specialty) => localizedSpecialty(specialty, locale)) });

  response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ success: false, message: "Not found" }));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`BLOC-1 Web visual fixture listening on ${port}`);
});

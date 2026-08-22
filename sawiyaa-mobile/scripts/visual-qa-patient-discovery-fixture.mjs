import { apiEnvelope, patientProfile, patientVisualQaAuth } from "./visual-qa-patient-home-fixture.mjs";

export const discoveryCategories = [
  { id: "cat-anxiety", name: "Anxiety", nameAr: "القلق", nameEn: "Anxiety", slug: "anxiety", description: null, isActive: true, sortOrder: 1 },
  { id: "cat-family", name: "Family", nameAr: "الأسرة", nameEn: "Family", slug: "family", description: null, isActive: true, sortOrder: 2 },
  { id: "cat-mood", name: "Mood", nameAr: "المزاج", nameEn: "Mood", slug: "mood", description: null, isActive: true, sortOrder: 3 },
  { id: "cat-child", name: "Children", nameAr: "الأطفال", nameEn: "Children", slug: "children", description: null, isActive: true, sortOrder: 4 },
];

function resolveLocale(locale) {
  return locale === "ar" ? "ar" : "en";
}

export function localizedDiscoveryCategories(locale = "en") {
  const resolvedLocale = resolveLocale(locale);
  return discoveryCategories.map((category) => ({
    ...category,
    name: resolvedLocale === "ar" ? category.nameAr : category.nameEn,
  }));
}

export const discoverySpecialties = discoveryCategories.flatMap((category, categoryIndex) => [
  {
    id: `${category.id}-primary`, name: category.name, nameAr: category.nameAr, nameEn: category.nameEn,
    slug: `${category.slug}-support`, description: null, isActive: true, sortOrder: categoryIndex + 1,
    category, createdAt: "2026-08-01T09:00:00.000Z", updatedAt: "2026-08-01T09:00:00.000Z",
  },
  {
    id: `${category.id}-focused`, name: `${category.name} support`, nameAr: `${category.nameAr} والدعم`, nameEn: `${category.name} support`,
    slug: `${category.slug}-focused`, description: null, isActive: true, sortOrder: categoryIndex + 10,
    category, createdAt: "2026-08-01T09:00:00.000Z", updatedAt: "2026-08-01T09:00:00.000Z",
  },
]);

export function localizedDiscoverySpecialties(locale = "en") {
  const resolvedLocale = resolveLocale(locale);
  const categories = localizedDiscoveryCategories(resolvedLocale);
  return discoverySpecialties.map((specialty) => ({
    ...specialty,
    name: resolvedLocale === "ar" ? specialty.nameAr : specialty.nameEn,
    category: categories.find((category) => category.id === specialty.category.id) ?? specialty.category,
  }));
}

const practitionerSpecialtyTitles = {
  "anxiety-support": { ar: "دعم القلق", en: "Anxiety support" },
  "family-support": { ar: "الدعم الأسري", en: "Family support" },
  "mood-support": { ar: "دعم المزاج", en: "Mood support" },
};

const practitionerProfessionalContent = {
  "mona-hassan": {
    ar: { professionalTitle: "أخصائية نفسية إكلينيكية", bioSnippet: "تقدم دعمًا نفسيًا هادئًا وعمليًا لمساعدتك على فهم مشاعرك وبناء خطوات أكثر توازنًا." },
    en: { professionalTitle: "Clinical Psychologist", bioSnippet: "Provides calm, practical support to help you understand your feelings and build more balanced next steps." },
  },
};

const specialists = [
  {
    id: "specialist-1", slug: "mona-hassan", displayName: "Mona Hassan", professionalTitle: "CLINICAL_PSYCHOLOGIST",
    bioSnippet: "Support for anxiety, stress, and life transitions.", specialties: [{ specialtyId: "s1", slug: "anxiety-support", title: "Anxiety support", isPrimary: true }],
    languages: ["ar", "en"], countryCode: "EG", currencyCode: "EGP", practitionerType: "PSYCHOLOGIST", practitionerGender: "female",
    pricing: { session30: { egp: 350, usd: null }, session60: { egp: 600, usd: null } }, sessionPrice30: 350, sessionPrice60: 600, isOnlineNow: false,
    acceptsCoupon: true, acceptsPackage: false, yearsExperience: 8, ratingSummary: { averageRating: 4.8, totalReviews: 42 }, avatarUrl: null, isVerified: true,
  },
  {
    id: "specialist-2", slug: "omar-adel", displayName: "Omar Adel", professionalTitle: "MENTAL_HEALTH_COUNSELOR",
    bioSnippet: "A practical, collaborative approach for everyday wellbeing.", specialties: [{ specialtyId: "s2", slug: "family-support", title: "Family support", isPrimary: true }],
    languages: ["ar", "en"], countryCode: "EG", currencyCode: "EGP", practitionerType: "COUNSELOR", practitionerGender: "male",
    pricing: { session30: { egp: 300, usd: null }, session60: { egp: 520, usd: null } }, sessionPrice30: 300, sessionPrice60: 520, isOnlineNow: false,
    acceptsCoupon: false, acceptsPackage: true, yearsExperience: 6, ratingSummary: { averageRating: 4.6, totalReviews: 27 }, avatarUrl: null, isVerified: true,
  },
  {
    id: "specialist-3", slug: "layla-nour", displayName: "Layla Nour", professionalTitle: "PSYCHOTHERAPIST",
    bioSnippet: "Thoughtful support for mood and relationship concerns.", specialties: [{ specialtyId: "s3", slug: "mood-support", title: "Mood support", isPrimary: true }],
    languages: ["ar"], countryCode: "EG", currencyCode: "EGP", practitionerType: "PSYCHOTHERAPIST", practitionerGender: "female",
    pricing: { session30: { egp: 400, usd: null }, session60: { egp: 700, usd: null } }, sessionPrice30: 400, sessionPrice60: 700, isOnlineNow: false,
    acceptsCoupon: false, acceptsPackage: false, yearsExperience: 10, ratingSummary: { averageRating: 4.9, totalReviews: 61 }, avatarUrl: null, isVerified: true,
  },
];

export function discoveryItems(state) {
  if (state === "no-results") return [];
  if (state === "specialty") return specialists.slice(0, 2);
  if (state === "filtered") return specialists.slice(0, 2);
  if (state === "search") return specialists.slice(0, 2);
  return specialists;
}

export function localizedDiscoveryItems(state, locale = "en") {
  const resolvedLocale = resolveLocale(locale);
  return discoveryItems(state).map((specialist) => ({
    ...specialist,
    ...(practitionerProfessionalContent[specialist.slug]?.[resolvedLocale] ?? {}),
    specialties: specialist.specialties.map((specialty) => ({
      ...specialty,
      title: practitionerSpecialtyTitles[specialty.slug]?.[resolvedLocale] ?? specialty.title,
    })),
  }));
}

export function discoveryListResponse(state, locale = "en") {
  const items = localizedDiscoveryItems(state, locale);
  return apiEnvelope({ items, pagination: { page: 1, limit: 12, totalItems: items.length, totalPages: 1 } });
}

export { apiEnvelope, patientProfile, patientVisualQaAuth };

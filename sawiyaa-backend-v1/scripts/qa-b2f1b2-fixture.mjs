import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ids = {
  country: 'a2f1b200-0000-4000-8000-000000000001',
  languageAr: 'a2f1b200-0000-4000-8000-000000000002',
  languageEn: 'a2f1b200-0000-4000-8000-000000000003',
  category: 'a2f1b200-0000-4000-8000-000000000004',
  specialty: 'a2f1b200-0000-4000-8000-000000000005',
  plan: 'a2f1b200-0000-4000-8000-000000000006',
  users: {
    a: 'a2f1b200-0000-4000-8000-000000000011',
    b: 'a2f1b200-0000-4000-8000-000000000012',
    c: 'a2f1b200-0000-4000-8000-000000000013',
    d: 'a2f1b200-0000-4000-8000-000000000014',
  },
  profiles: {
    a: 'a2f1b200-0000-4000-8000-000000000021',
    b: 'a2f1b200-0000-4000-8000-000000000022',
    c: 'a2f1b200-0000-4000-8000-000000000023',
    d: 'a2f1b200-0000-4000-8000-000000000024',
  },
};

const profileBase = {
  countryId: ids.country,
  practitionerType: 'COUNSELOR',
  practitionerGender: 'FEMALE',
  yearsOfExperience: 8,
  sessionPrice30: 500,
  sessionPrice60: 900,
  sessionPrice30Egp: 500,
  sessionPrice30Usd: 20,
  sessionPrice60Egp: 900,
  sessionPrice60Usd: 36,
  instantBookingPrice30Egp: 500,
  instantBookingPrice30Usd: 20,
  instantBookingPrice60Egp: 900,
  instantBookingPrice60Usd: 36,
  isPublicProfilePublished: true,
  status: 'APPROVED',
  operationalStatus: 'ACTIVE',
  complianceState: 'VERIFIED',
  acceptsNormalBookings: true,
  acceptsPackages: true,
  preferredPayoutCurrencyCode: 'EGP',
};

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.packagePlan.deleteMany({ where: { id: ids.plan } });
    await tx.practitionerProfile.deleteMany({ where: { id: { in: Object.values(ids.profiles) } } });
    await tx.user.deleteMany({ where: { id: { in: Object.values(ids.users) } } });
    await tx.practitionerSpecialty.deleteMany({ where: { specialtyId: ids.specialty } });
    await tx.specialtyTranslation.deleteMany({ where: { specialtyId: ids.specialty } });
    await tx.specialty.deleteMany({ where: { id: ids.specialty } });
    await tx.specialtyCategory.deleteMany({ where: { id: ids.category } });
    await tx.language.deleteMany({ where: { id: { in: [ids.languageAr, ids.languageEn] } } });
    await tx.country.deleteMany({ where: { id: ids.country } });

    await tx.country.create({
      data: {
        id: ids.country,
        isoCode: 'QA',
        slug: 'qa-b2f1b2-country',
        name: 'BLOC-2F1B2 QA Country',
        nativeName: 'بلد اختبار BLOC-2F1B2',
        phoneCode: '+974',
        currencyCode: 'EGP',
      },
    });
    await tx.language.createMany({
      data: [
        { id: ids.languageAr, code: 'ar', slug: 'qa-b2f1b2-ar', name: 'Arabic', nativeName: 'العربية' },
        { id: ids.languageEn, code: 'en', slug: 'qa-b2f1b2-en', name: 'English', nativeName: 'English' },
      ],
    });
    await tx.specialtyCategory.create({
      data: { id: ids.category, slug: 'qa-b2f1b2-category', name: 'QA Category', nameAr: 'فئة اختبار', nameEn: 'QA Category' },
    });
    await tx.specialty.create({
      data: { id: ids.specialty, categoryId: ids.category, slug: 'qa-b2f1b2-specialty', nameAr: 'تخصص اختبار', nameEn: 'QA Specialty' },
    });
    await tx.specialtyTranslation.create({
      data: { specialtyId: ids.specialty, locale: 'en', title: 'SpecialtyNeedle', description: 'BLOC-2F1B2 specialty regression', slug: 'qa-b2f1b2-specialty-en' },
    });
    await tx.packagePlan.create({
      data: {
        id: ids.plan,
        code: 'SESSIONS_4',
        sessionCount: 4,
        discountPercent: 10,
        isActive: true,
        sortOrder: 1,
        title: 'BLOC-2F1B2 QA Package',
        description: 'Disposable BLOC-2F1B2 package offer',
      },
    });

    const users = [
      { id: ids.users.a, displayName: 'BLOC QA Practitioner A', profileId: ids.profiles.a, slug: 'bloc-2f1b2-practitioner-a', professionalTitle: 'Legacy A unrelated', bio: 'Legacy A biography unrelated', translations: [
        { locale: 'ar', professionalTitle: 'معالج أسري متقدم', bio: 'متخصص في الإرشاد الأسري المتكامل' },
        { locale: 'en', professionalTitle: 'Advanced Family Therapist', bio: 'Specialist in integrated family counseling' },
      ], primaryContentLocale: 'ar', public: true },
      { id: ids.users.b, displayName: 'BLOC QA Practitioner B', profileId: ids.profiles.b, slug: 'bloc-2f1b2-practitioner-b', professionalTitle: 'LegacyOnlyNeedle', bio: 'LegacyBioOnlyNeedle', translations: [], primaryContentLocale: null, public: true },
      { id: ids.users.c, displayName: 'BLOC QA Practitioner C', profileId: ids.profiles.c, slug: 'bloc-2f1b2-practitioner-c', professionalTitle: 'Legacy C unrelated', bio: 'Legacy C biography unrelated', translations: [
        { locale: 'ar', professionalTitle: 'Hidden متقدم', bio: 'Hidden translation' },
        { locale: 'en', professionalTitle: 'Hidden Advanced', bio: 'Hidden translation' },
      ], primaryContentLocale: 'ar', public: false },
      { id: ids.users.d, displayName: 'BLOC QA Practitioner D', profileId: ids.profiles.d, slug: 'bloc-2f1b2-practitioner-d', professionalTitle: 'DedupNeedle legacy', bio: 'Dedup biography', translations: [
        { locale: 'ar', professionalTitle: 'DedupNeedle Arabic', bio: 'Dedup Arabic biography' },
        { locale: 'en', professionalTitle: 'DedupNeedle English', bio: 'Dedup English biography' },
      ], primaryContentLocale: 'en', public: true },
    ];

    for (const item of users) {
      await tx.user.create({ data: { id: item.id, displayName: item.displayName, status: 'ACTIVE', defaultLocale: 'en', timezone: 'Africa/Cairo' } });
      await tx.practitionerProfile.create({
        data: {
          id: item.profileId,
          userId: item.id,
          publicSlug: item.slug,
          professionalTitle: item.professionalTitle,
          bio: item.bio,
          primaryContentLocale: item.primaryContentLocale,
          ...profileBase,
          isPublicProfilePublished: item.public,
          status: item.public ? 'APPROVED' : 'PENDING_REVIEW',
          acceptsPackages: item.public,
          professionalContentTranslations: item.translations.length ? { create: item.translations } : undefined,
          specialties: { create: { specialtyId: ids.specialty, isPrimary: true } },
          languages: { create: [{ languageId: ids.languageAr, isPrimary: true }, { languageId: ids.languageEn, isPrimary: false }] },
        },
      });
    }
  });

  console.log(JSON.stringify({
    fixture: 'BLOC-2F1B2',
    utf8: true,
    practitioners: {
      A: { id: ids.profiles.a, slug: 'bloc-2f1b2-practitioner-a', displayName: 'BLOC QA Practitioner A' },
      B: { id: ids.profiles.b, slug: 'bloc-2f1b2-practitioner-b', displayName: 'BLOC QA Practitioner B' },
      C: { id: ids.profiles.c, slug: 'bloc-2f1b2-practitioner-c', displayName: 'BLOC QA Practitioner C' },
      D: { id: ids.profiles.d, slug: 'bloc-2f1b2-practitioner-d', displayName: 'BLOC QA Practitioner D' },
    },
    packagePlan: { id: ids.plan, code: 'SESSIONS_4', sessionCount: 4, discountPercent: '10.00', prices: { EGP30: '500.00', EGP60: '900.00' } },
    searchTokens: { arTitle: 'متقدم', arBio: 'المتكامل', enTitle: 'Advanced', enBio: 'integrated', legacy: 'LegacyOnlyNeedle', specialty: 'SpecialtyNeedle', dedup: 'DedupNeedle' },
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

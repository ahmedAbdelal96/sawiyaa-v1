import { ContentLocale, Prisma, PrismaClient } from '@prisma/client';
import { CONFIG_KEYS } from '../../src/modules/config/registry/config-key.constants';
import { STANDARD_PACKAGE_PLANS } from '../../src/modules/package-plans/package-plan.catalog';
import {
  permissionDefinitions,
  rolePermissionBundles,
} from './modules/auth.permissions';
import { ensureProductionFinancialRules } from './modules/financial-rules.seed';
import { seedConfigData } from './modules/config.seed';
import { assessmentsSeedModule } from './modules/assessments.seed';
import { notificationsSeedModule } from './modules/notifications.seed';
import { PRODUCTION_COUNTRY_CATALOG } from './modules/country-catalog';

export const PRODUCTION_BASELINE_SPECIALTIES = [
  { category: 'mental-health', specialty: 'anxiety-therapy', name: 'Anxiety Therapy' },
  { category: 'mental-health', specialty: 'depression-counseling', name: 'Depression Counseling' },
  { category: 'mental-health', specialty: 'family-counseling', name: 'Family Counseling' },
  { category: 'mental-health', specialty: 'child-psychology', name: 'Child Psychology' },
  { category: 'nutrition', specialty: 'clinical-nutrition', name: 'Clinical Nutrition' },
  { category: 'nutrition', specialty: 'emotional-eating-management', name: 'Emotional Eating Management' },
  { category: 'nutrition', specialty: 'weight-management', name: 'Weight Management' },
  { category: 'sports-therapy', specialty: 'sports-injury-rehabilitation', name: 'Sports Injury Rehabilitation' },
  { category: 'sports-therapy', specialty: 'athletic-performance-improvement', name: 'Athletic Performance Improvement' },
] as const;

type ProductionBaselineSummary = {
  permissions: { created: number; preserved: number };
  rolePermissions: { created: number; preserved: number };
  countries: { created: number; preserved: number };
  languages: { created: number; preserved: number };
  specialties: { created: number; preserved: number };
  packagePlans: { created: number; preserved: number };
  financialRules: { created: number; preserved: number };
  config: Awaited<ReturnType<typeof seedConfigData>>;
};

async function ensureAccessBaseline(prisma: PrismaClient) {
  const permissions = new Map<string, string>();
  let permissionCreated = 0;
  let permissionPreserved = 0;
  for (const permission of permissionDefinitions) {
    const existing = await prisma.permission.findUnique({
      where: { key: permission.key },
      select: { id: true },
    });
    const row = existing
      ? existing
      : await prisma.permission.create({ data: permission });
    permissions.set(permission.key, row.id);
    if (existing) permissionPreserved += 1;
    else permissionCreated += 1;
  }

  let rolePermissionCreated = 0;
  let rolePermissionPreserved = 0;
  for (const bundle of rolePermissionBundles) {
    for (const key of bundle.permissions) {
      const permissionId = permissions.get(key);
      if (!permissionId) continue;
      const existing = await prisma.rolePermission.findUnique({
        where: { role_permissionId: { role: bundle.role, permissionId } },
        select: { role: true },
      });
      if (existing) {
        rolePermissionPreserved += 1;
      } else {
        await prisma.rolePermission.create({
          data: { role: bundle.role, permissionId },
        });
        rolePermissionCreated += 1;
      }
    }
  }

  return {
    permissions: { created: permissionCreated, preserved: permissionPreserved },
    rolePermissions: {
      created: rolePermissionCreated,
      preserved: rolePermissionPreserved,
    },
  };
}

export async function ensureProductionCountryCatalog(prisma: PrismaClient) {
  let countriesCreated = 0;
  let countriesPreserved = 0;
  for (const country of PRODUCTION_COUNTRY_CATALOG) {
    const existing = await prisma.country.findUnique({
      where: { isoCode: country.isoCode },
      select: { id: true },
    });
    if (existing) countriesPreserved += 1;
    else {
      await prisma.country.create({ data: { ...country, isActive: true } });
      countriesCreated += 1;
    }
  }
  return { created: countriesCreated, preserved: countriesPreserved };
}

async function ensureReferenceBaseline(prisma: PrismaClient) {
  const countries = await ensureProductionCountryCatalog(prisma);
  const languages = [
    { code: 'ar', slug: 'arabic', name: 'Arabic', nativeName: 'Arabic' },
    { code: 'en', slug: 'english', name: 'English', nativeName: 'English' },
    { code: 'fr', slug: 'french', name: 'French', nativeName: 'French' },
    { code: 'de', slug: 'german', name: 'German', nativeName: 'German' },
    { code: 'es', slug: 'spanish', name: 'Spanish', nativeName: 'Spanish' },
    { code: 'tr', slug: 'turkish', name: 'Turkish', nativeName: 'Turkish' },
    { code: 'ru', slug: 'russian', name: 'Russian', nativeName: 'Russian' },
  ];
  let languagesCreated = 0;
  let languagesPreserved = 0;
  for (const language of languages) {
    const existing = await prisma.language.findUnique({
      where: { code: language.code },
      select: { id: true },
    });
    if (existing) languagesPreserved += 1;
    else {
      await prisma.language.create({ data: { ...language, isActive: true } });
      languagesCreated += 1;
    }
  }
  return {
    countries,
    languages: { created: languagesCreated, preserved: languagesPreserved },
  };
}

async function ensureSpecialtyBaseline(prisma: PrismaClient) {
  const categoryNames = new Map([
    ['mental-health', 'Mental Health'],
    ['nutrition', 'Nutrition'],
    ['sports-therapy', 'Sports Therapy'],
  ]);
  const categoryIds = new Map<string, string>();
  let created = 0;
  let preserved = 0;
  for (const [slug, name] of categoryNames) {
    const existing = await prisma.specialtyCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    const row = existing
      ? existing
      : await prisma.specialtyCategory.create({
          data: { slug, name, nameEn: name, isActive: true },
        });
    categoryIds.set(slug, row.id);
  }
  for (const [index, item] of PRODUCTION_BASELINE_SPECIALTIES.entries()) {
    const existing = await prisma.specialty.findUnique({
      where: { slug: item.specialty },
      select: { id: true },
    });
    const specialty = existing
      ? existing
      : await prisma.specialty.create({
          data: {
            slug: item.specialty,
            nameEn: item.name,
            categoryId: categoryIds.get(item.category) ?? null,
            sortOrder: index + 1,
            isActive: true,
          },
        });
    const translations = [
      { locale: ContentLocale.en, title: item.name, slug: `${item.specialty}-en` },
      { locale: ContentLocale.ar, title: item.name, slug: `${item.specialty}-ar` },
    ];
    for (const translation of translations) {
      const existingTranslation = await prisma.specialtyTranslation.findUnique({
        where: {
          specialtyId_locale: { specialtyId: specialty.id, locale: translation.locale },
        },
        select: { id: true },
      });
      if (!existingTranslation) {
        await prisma.specialtyTranslation.create({
          data: { specialtyId: specialty.id, ...translation, description: null },
        });
      }
    }
    if (existing) preserved += 1;
    else created += 1;
  }
  return { created, preserved };
}

async function ensurePackagePlanBaseline(prisma: PrismaClient) {
  let created = 0;
  let preserved = 0;
  for (const plan of STANDARD_PACKAGE_PLANS) {
    const existing = await prisma.packagePlan.findUnique({
      where: { code: plan.code },
      select: { id: true },
    });
    if (existing) {
      preserved += 1;
      continue;
    }
    await prisma.packagePlan.create({
      data: {
        code: plan.code,
        sessionCount: plan.sessionCount,
        discountPercent: plan.discountPercent,
        isActive: true,
        sortOrder: plan.sortOrder,
        title: plan.title,
        description: plan.description,
        archivedAt: null,
        metadataJson: plan.metadataJson as Prisma.InputJsonValue,
      },
    });
    created += 1;
  }
  return { created, preserved };
}

export async function seedProductionBaseline(
  prisma: PrismaClient,
): Promise<ProductionBaselineSummary> {
  const config = await seedConfigData(prisma);
  const { access, reference, specialties, packagePlans, financialRules } =
    await prisma.$transaction(
      async (tx) => {
        const db = tx as unknown as PrismaClient;
        const access = await ensureAccessBaseline(db);
        const reference = await ensureReferenceBaseline(db);
        const specialties = await ensureSpecialtyBaseline(db);
        const packagePlans = await ensurePackagePlanBaseline(db);
        const financialRules = await ensureProductionFinancialRules(db);
        await assessmentsSeedModule.run(db);
        await notificationsSeedModule.run(db);
        return { access, reference, specialties, packagePlans, financialRules };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

  return {
    ...access,
    ...reference,
    specialties,
    packagePlans,
    financialRules,
    config,
  };
}

export function productionBaselineOperatorConfigKeys(): string[] {
  return [
    CONFIG_KEYS.payment.provider.paymob.enabled,
    CONFIG_KEYS.payment.provider.paymob.checkoutFlow,
    CONFIG_KEYS.payment.provider.paymob.defaultMethod,
    CONFIG_KEYS.payment.provider.paymob.methodRegistry,
    CONFIG_KEYS.payment.provider.paymob.maintenanceMode,
    CONFIG_KEYS.payment.provider.paymob.allowedCountries,
    CONFIG_KEYS.payment.routing.currencyRoutes,
  ];
}

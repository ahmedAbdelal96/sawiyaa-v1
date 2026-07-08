import { ContentLocale, PrismaClient } from '@prisma/client';
import { seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';

type SpecialtyCategorySeed = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  sortOrder: number;
};

type SpecialtySeed = {
  id: string;
  categorySlug: string;
  slug: string;
  sortOrder: number;
  nameAr: string;
  nameEn: string;
  translations: {
    en: {
      title: string;
      description: string;
      slug: string;
    };
    ar: {
      title: string;
      description: string;
      slug: string;
    };
  };
};

async function getColumnNames(
  prisma: PrismaClient,
  tableName: string,
): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = ${tableName}
  `;

  return new Set(rows.map((row) => row.column_name));
}

function withLocalizedCategoryFields(
  base: Record<string, unknown>,
  category: SpecialtyCategorySeed,
  hasLocalizedColumns: boolean,
): Record<string, unknown> {
  if (!hasLocalizedColumns) {
    return base;
  }

  return {
    ...base,
    nameAr: category.nameAr,
    nameEn: category.nameEn,
  };
}

function withLocalizedSpecialtyFields(
  base: Record<string, unknown>,
  specialty: SpecialtySeed,
  hasLocalizedColumns: boolean,
): Record<string, unknown> {
  if (!hasLocalizedColumns) {
    return base;
  }

  return {
    ...base,
    nameAr: specialty.nameAr,
    nameEn: specialty.nameEn,
  };
}

async function upsertSpecialtyCategoryForLegacyDatabase(
  prisma: PrismaClient,
  category: SpecialtyCategorySeed,
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "SpecialtyCategory" (
      "id",
      "slug",
      "name",
      "description",
      "sortOrder",
      "isActive",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${category.id}::uuid,
      ${category.slug},
      ${category.nameEn},
      ${category.description},
      ${category.sortOrder},
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("id") DO UPDATE SET
      "slug" = EXCLUDED."slug",
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "sortOrder" = EXCLUDED."sortOrder",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

async function upsertSpecialtyForLegacyDatabase(
  prisma: PrismaClient,
  specialty: SpecialtySeed,
  categoryId: string,
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "Specialty" (
      "id",
      "categoryId",
      "slug",
      "sortOrder",
      "isActive",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${specialty.id}::uuid,
      ${categoryId}::uuid,
      ${specialty.slug},
      ${specialty.sortOrder},
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("id") DO UPDATE SET
      "categoryId" = EXCLUDED."categoryId",
      "slug" = EXCLUDED."slug",
      "sortOrder" = EXCLUDED."sortOrder",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

/**
 * Specialties seed module:
 * - creates main specialty categories
 * - creates sub-specialties linked to categories
 * - keeps translations ready for public/admin filtering
 */
export const specialtiesSeedModule: SeedModule = {
  name: 'specialties',
  async run(prisma: PrismaClient): Promise<void> {
    const [specialtyCategoryColumns, specialtyColumns] = await Promise.all([
      getColumnNames(prisma, 'SpecialtyCategory'),
      getColumnNames(prisma, 'Specialty'),
    ]);
    const hasSpecialtyCategoryLocalizedColumns =
      specialtyCategoryColumns.has('nameAr') && specialtyCategoryColumns.has('nameEn');
    const hasSpecialtyLocalizedColumns =
      specialtyColumns.has('nameAr') && specialtyColumns.has('nameEn');

    const categories: SpecialtyCategorySeed[] = [
      {
        id: seedIds.specialtyCategories.mentalHealth,
        slug: 'mental-health',
        nameAr: 'الصحة النفسية',
        nameEn: 'Mental Health',
        description: 'تخصصات الصحة النفسية والعلاج السلوكي',
        sortOrder: 1,
      },
      {
        id: seedIds.specialtyCategories.nutrition,
        slug: 'nutrition',
        nameAr: 'التغذية',
        nameEn: 'Nutrition',
        description: 'تخصصات التغذية العلاجية وإدارة الوزن',
        sortOrder: 2,
      },
      {
        id: seedIds.specialtyCategories.fitness,
        slug: 'sports-therapy',
        nameAr: 'العلاج الرياضي',
        nameEn: 'Sports Therapy',
        description: 'تخصصات العلاج الرياضي والتأهيل الحركي',
        sortOrder: 3,
      },
    ];

    await prisma.specialtyCategory.deleteMany({
      where: {
        slug: {
          in: categories.map((category) => category.slug),
        },
        id: {
          notIn: categories.map((category) => category.id),
        },
      },
    });

    for (const category of categories) {
      if (hasSpecialtyCategoryLocalizedColumns) {
        await prisma.specialtyCategory.upsert({
          where: { id: category.id },
          create: {
            id: category.id,
            slug: category.slug,
            name: category.nameEn,
            description: category.description,
            sortOrder: category.sortOrder,
            isActive: true,
            ...withLocalizedCategoryFields({}, category, true),
          },
          update: {
            name: category.nameEn,
            description: category.description,
            sortOrder: category.sortOrder,
            isActive: true,
            ...withLocalizedCategoryFields({}, category, true),
          },
        });
      } else {
        await upsertSpecialtyCategoryForLegacyDatabase(prisma, category);
      }
    }

    await prisma.specialtyCategory.updateMany({
      where: {
        slug: {
          notIn: categories.map((category) => category.slug),
        },
        specialties: {
          none: {},
        },
      },
      data: {
        isActive: false,
      },
    });

    const specialties: SpecialtySeed[] = [
      {
        id: seedIds.specialties.anxiety,
        categorySlug: 'mental-health',
        slug: 'anxiety-therapy',
        nameAr: 'علاج القلق',
        nameEn: 'Anxiety Therapy',
        sortOrder: 1,
        translations: {
          en: {
            title: 'Anxiety Therapy',
            description: 'Therapy plans focused on anxiety symptoms',
            slug: 'anxiety-therapy',
          },
          ar: {
            title: 'علاج القلق',
            description: 'جلسات علاج نفسي موجهة للقلق والتوتر',
            slug: 'anxiety-therapy-ar',
          },
        },
      },
      {
        id: seedIds.specialties.depression,
        categorySlug: 'mental-health',
        slug: 'depression-counseling',
        nameAr: 'إرشاد الاكتئاب',
        nameEn: 'Depression Counseling',
        sortOrder: 2,
        translations: {
          en: {
            title: 'Depression Counseling',
            description: 'Counseling plans for depression and mood support',
            slug: 'depression-counseling',
          },
          ar: {
            title: 'إرشاد الاكتئاب',
            description: 'جلسات علاجية لدعم حالات الاكتئاب واضطراب المزاج',
            slug: 'depression-counseling-ar',
          },
        },
      },
      {
        id: seedIds.specialties.familyCounseling,
        categorySlug: 'mental-health',
        slug: 'family-counseling',
        nameAr: 'الإرشاد الأسري',
        nameEn: 'Family Counseling',
        sortOrder: 3,
        translations: {
          en: {
            title: 'Family Counseling',
            description: 'Family and relationship counseling',
            slug: 'family-counseling',
          },
          ar: {
            title: 'الإرشاد الأسري',
            description: 'جلسات متخصصة لحل مشكلات الأسرة والعلاقات الزوجية',
            slug: 'family-counseling-ar',
          },
        },
      },
      {
        id: seedIds.specialties.childPsychology,
        categorySlug: 'mental-health',
        slug: 'child-psychology',
        nameAr: 'علم نفس الطفل',
        nameEn: 'Child Psychology',
        sortOrder: 4,
        translations: {
          en: {
            title: 'Child Psychology',
            description: 'Psychological care for children and adolescents',
            slug: 'child-psychology',
          },
          ar: {
            title: 'علم نفس الطفل',
            description: 'متابعة نفسية للأطفال والمراهقين',
            slug: 'child-psychology-ar',
          },
        },
      },
      {
        id: seedIds.specialties.nutrition,
        categorySlug: 'nutrition',
        slug: 'clinical-nutrition',
        nameAr: 'التغذية العلاجية',
        nameEn: 'Clinical Nutrition',
        sortOrder: 5,
        translations: {
          en: {
            title: 'Clinical Nutrition',
            description: 'Evidence-based nutrition plans for health conditions',
            slug: 'clinical-nutrition',
          },
          ar: {
            title: 'التغذية العلاجية',
            description: 'خطط غذائية علاجية للحالات الصحية المختلفة',
            slug: 'clinical-nutrition-ar',
          },
        },
      },
      {
        id: seedIds.specialties.emotionalEating,
        categorySlug: 'nutrition',
        slug: 'emotional-eating-management',
        nameAr: 'إدارة الأكل العاطفي',
        nameEn: 'Emotional Eating Management',
        sortOrder: 6,
        translations: {
          en: {
            title: 'Emotional Eating Management',
            description: 'Behavioral support for emotional eating control',
            slug: 'emotional-eating-management',
          },
          ar: {
            title: 'إدارة الأكل العاطفي',
            description: 'برامج سلوكية للتحكم في الأكل المرتبط بالمشاعر',
            slug: 'emotional-eating-management-ar',
          },
        },
      },
      {
        id: seedIds.specialties.weightManagement,
        categorySlug: 'nutrition',
        slug: 'weight-management',
        nameAr: 'إدارة الوزن',
        nameEn: 'Weight Management',
        sortOrder: 7,
        translations: {
          en: {
            title: 'Weight Management',
            description: 'Healthy and sustainable weight loss programs',
            slug: 'weight-management',
          },
          ar: {
            title: 'إدارة الوزن',
            description: 'خطط نزول وزن صحية ومستدامة',
            slug: 'weight-management-ar',
          },
        },
      },
      {
        id: seedIds.specialties.sportsInjuryRehab,
        categorySlug: 'sports-therapy',
        slug: 'sports-injury-rehabilitation',
        nameAr: 'تأهيل إصابات رياضية',
        nameEn: 'Sports Injury Rehabilitation',
        sortOrder: 8,
        translations: {
          en: {
            title: 'Sports Injury Rehabilitation',
            description: 'Rehab and return-to-activity plans for injuries',
            slug: 'sports-injury-rehabilitation',
          },
          ar: {
            title: 'تأهيل إصابات رياضية',
            description: 'خطط تأهيل بعد الإصابات الرياضية والعودة للتدريب',
            slug: 'sports-injury-rehabilitation-ar',
          },
        },
      },
      {
        id: seedIds.specialties.athleticPerformance,
        categorySlug: 'sports-therapy',
        slug: 'athletic-performance-improvement',
        nameAr: 'تحسين الأداء الرياضي',
        nameEn: 'Athletic Performance Improvement',
        sortOrder: 9,
        translations: {
          en: {
            title: 'Athletic Performance Improvement',
            description: 'Strength, conditioning, and performance optimization',
            slug: 'athletic-performance-improvement',
          },
          ar: {
            title: 'تحسين الأداء الرياضي',
            description: 'برامج لرفع اللياقة والقوة وتحسين الأداء الرياضي',
            slug: 'athletic-performance-improvement-ar',
          },
        },
      },
    ];

    const categoryRows = await prisma.specialtyCategory.findMany({
      where: {
        slug: {
          in: categories.map((category) => category.slug),
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });
    const categoryIdBySlug = new Map(
      categoryRows.map((category) => [category.slug, category.id] as const),
    );

    const translationSlugPairs = specialties.flatMap((specialty) => [
      { locale: ContentLocale.en, slug: `${specialty.slug}-en` },
      { locale: ContentLocale.ar, slug: `${specialty.slug}-ar` },
    ]);

    await prisma.specialty.deleteMany({
      where: {
        slug: {
          in: specialties.map((specialty) => specialty.slug),
        },
        id: {
          notIn: specialties.map((specialty) => specialty.id),
        },
      },
    });

    await prisma.specialtyTranslation.deleteMany({
      where: {
        OR: translationSlugPairs.map((pair) => ({
          locale: pair.locale,
          slug: pair.slug,
        })),
      },
    });

    for (const specialty of specialties) {
      const categoryId = categoryIdBySlug.get(specialty.categorySlug);
      if (!categoryId) {
        throw new Error(
          `[seed:specialties] category not found for slug: ${specialty.categorySlug}`,
        );
      }

      if (hasSpecialtyLocalizedColumns) {
        await prisma.specialty.upsert({
          where: { id: specialty.id },
          create: {
            id: specialty.id,
            categoryId,
            slug: specialty.slug,
            sortOrder: specialty.sortOrder,
            isActive: true,
            ...withLocalizedSpecialtyFields({}, specialty, true),
          },
          update: {
            slug: specialty.slug,
            categoryId,
            sortOrder: specialty.sortOrder,
            isActive: true,
            ...withLocalizedSpecialtyFields({}, specialty, true),
          },
        });
      } else {
        await upsertSpecialtyForLegacyDatabase(prisma, specialty, categoryId);
      }

      const localeRows: Array<{
        locale: ContentLocale;
        title: string;
        description: string;
      }> = [
        { locale: ContentLocale.en, ...specialty.translations.en },
        { locale: ContentLocale.ar, ...specialty.translations.ar },
      ];

      for (const localeRow of localeRows) {
        await prisma.specialtyTranslation.upsert({
          where: {
            specialtyId_locale: {
              specialtyId: specialty.id,
              locale: localeRow.locale,
            },
          },
          create: {
            specialtyId: specialty.id,
            locale: localeRow.locale,
            title: localeRow.title,
            description: localeRow.description,
            slug: `${specialty.slug}-${localeRow.locale}`,
          },
          update: {
            title: localeRow.title,
            description: localeRow.description,
            slug: `${specialty.slug}-${localeRow.locale}`,
          },
        });
      }
    }
  },
};

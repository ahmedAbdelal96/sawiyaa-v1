import { ContentLocale, PrismaClient } from '@prisma/client';
import { seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';

/**
 * Specialties seed module:
 * - creates main specialty categories
 * - creates sub-specialties linked to categories
 * - keeps translations ready for public/admin filtering
 */
export const specialtiesSeedModule: SeedModule = {
  name: 'specialties',
  async run(prisma: PrismaClient): Promise<void> {
    const categories = [
      {
        id: seedIds.specialtyCategories.mentalHealth,
        slug: 'mental-health',
        name: 'النفسي',
        description: 'تخصصات الصحة النفسية والعلاج النفسي',
        sortOrder: 1,
      },
      {
        id: seedIds.specialtyCategories.nutrition,
        slug: 'nutrition',
        name: 'التغذية',
        description: 'تخصصات التغذية العلاجية وإدارة الوزن',
        sortOrder: 2,
      },
      {
        id: seedIds.specialtyCategories.fitness,
        slug: 'fitness',
        name: 'الرياضة',
        description: 'تخصصات الأداء الرياضي والتأهيل الحركي',
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
      await prisma.specialtyCategory.upsert({
        where: { id: category.id },
        create: {
          id: category.id,
          slug: category.slug,
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
          isActive: true,
        },
        update: {
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
          isActive: true,
        },
      });
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

    const specialties = [
      {
        id: seedIds.specialties.anxiety,
        categorySlug: 'mental-health',
        slug: 'anxiety-therapy',
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
        categorySlug: 'fitness',
        slug: 'sports-injury-rehabilitation',
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
        categorySlug: 'fitness',
        slug: 'athletic-performance-improvement',
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

      await prisma.specialty.upsert({
        where: { id: specialty.id },
        create: {
          id: specialty.id,
          categoryId,
          slug: specialty.slug,
          sortOrder: specialty.sortOrder,
          isActive: true,
        },
        update: {
          slug: specialty.slug,
          categoryId,
          sortOrder: specialty.sortOrder,
          isActive: true,
        },
      });

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

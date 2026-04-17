import { PrismaClient } from '@prisma/client';
import { seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';

/**
 * Reference-data seed module (countries + languages) used by multiple business modules.
 */
export const referenceDataSeedModule: SeedModule = {
  name: 'reference-data',
  async run(prisma: PrismaClient): Promise<void> {
    const countries = [
      {
        id: seedIds.countries.egypt,
        isoCode: 'EG',
        slug: 'egypt',
        name: 'Egypt',
        nativeName: 'Egypt',
        phoneCode: '+20',
        currencyCode: 'EGP',
        isActive: true,
      },
      {
        id: seedIds.countries.saudiArabia,
        isoCode: 'SA',
        slug: 'saudi-arabia',
        name: 'Saudi Arabia',
        nativeName: 'Saudi Arabia',
        phoneCode: '+966',
        currencyCode: 'SAR',
        isActive: true,
      },
      {
        id: seedIds.countries.uae,
        isoCode: 'AE',
        slug: 'united-arab-emirates',
        name: 'United Arab Emirates',
        nativeName: 'United Arab Emirates',
        phoneCode: '+971',
        currencyCode: 'AED',
        isActive: true,
      },
      {
        id: seedIds.countries.kuwait,
        isoCode: 'KW',
        slug: 'kuwait',
        name: 'Kuwait',
        nativeName: 'Kuwait',
        phoneCode: '+965',
        currencyCode: 'KWD',
        isActive: true,
      },
      {
        id: seedIds.countries.qatar,
        isoCode: 'QA',
        slug: 'qatar',
        name: 'Qatar',
        nativeName: 'Qatar',
        phoneCode: '+974',
        currencyCode: 'QAR',
        isActive: true,
      },
    ];

    for (const country of countries) {
      await prisma.country.upsert({
        where: { isoCode: country.isoCode },
        create: country,
        update: {
          slug: country.slug,
          name: country.name,
          nativeName: country.nativeName,
          phoneCode: country.phoneCode,
          currencyCode: country.currencyCode,
          isActive: country.isActive,
        },
      });
    }

    const languages = [
      {
        id: seedIds.languages.arabic,
        code: 'ar',
        slug: 'arabic',
        name: 'Arabic',
        nativeName: 'Arabic',
        isActive: true,
      },
      {
        id: seedIds.languages.english,
        code: 'en',
        slug: 'english',
        name: 'English',
        nativeName: 'English',
        isActive: true,
      },
    ];

    for (const language of languages) {
      await prisma.language.upsert({
        where: { code: language.code },
        create: language,
        update: {
          slug: language.slug,
          name: language.name,
          nativeName: language.nativeName,
          isActive: language.isActive,
        },
      });
    }
  },
};

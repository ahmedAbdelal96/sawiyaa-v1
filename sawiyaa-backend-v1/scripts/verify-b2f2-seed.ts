import { ContentLocale, PrismaClient } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { PractitionerProfessionalContentResolver } from '../src/modules/practitioners/services/practitioner-professional-content-resolver.service';
import { professionalContentFixtures } from '../prisma/seed/modules/professional-content-fixtures.seed';

const prisma = new PrismaClient();
const artifactPath =
  process.env.BLOC_2F2_ARTIFACT ??
  'D:/Web/full-projects/sawiyaa/qa-artifacts/BLOC-2F2/seed-summary.json';
const resolver = new PractitionerProfessionalContentResolver();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`BLOC-2F2 seed assertion failed: ${message}`);
  }
}

async function main(): Promise<void> {
  const profiles = await prisma.practitionerProfile.findMany({
    where: {
      id: {
        in: professionalContentFixtures.map((fixture) => fixture.profileId),
      },
    },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      userId: true,
      publicSlug: true,
      professionalTitle: true,
      bio: true,
      primaryContentLocale: true,
      status: true,
      isPublicProfilePublished: true,
      acceptsPackages: true,
      user: { select: { displayName: true } },
      professionalContentTranslations: {
        orderBy: { locale: 'asc' },
        select: { locale: true, professionalTitle: true, bio: true },
      },
    },
  });

  assert(
    profiles.length === professionalContentFixtures.length,
    `expected ${professionalContentFixtures.length} dedicated profiles, found ${profiles.length}`,
  );

  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  const normalized = professionalContentFixtures.map((fixture) => {
    const profile = byId.get(fixture.profileId);
    assert(profile, `${fixture.scenario} profile is missing`);
    assert(
      profile.userId === fixture.userId,
      `${fixture.scenario} user identity drift`,
    );
    assert(
      profile.publicSlug === fixture.publicSlug,
      `${fixture.scenario} slug drift`,
    );
    assert(
      profile.primaryContentLocale === fixture.primaryContentLocale,
      `${fixture.scenario} primary locale drift`,
    );
    assert(
      profile.professionalTitle === fixture.professionalTitle &&
        profile.bio === fixture.bio,
      `${fixture.scenario} legacy compatibility fields drift`,
    );
    assert(
      profile.user.displayName === fixture.displayName &&
        !profile.user.displayName.includes('BLOC2F2_'),
      `${fixture.scenario} canonical display name drift or marker contamination`,
    );
    assert(
      profile.professionalContentTranslations.length ===
        fixture.translations.length,
      `${fixture.scenario} translation row count drift`,
    );

    for (const expected of fixture.translations) {
      const actual = profile.professionalContentTranslations.find(
        (translation) => translation.locale === expected.locale,
      );
      assert(
        actual,
        `${fixture.scenario} ${expected.locale} translation is missing`,
      );
      assert(
        actual.professionalTitle === expected.professionalTitle &&
          actual.bio === expected.bio,
        `${fixture.scenario} ${expected.locale} field/null state drift`,
      );
    }

    if (fixture.scenario === 'S4') {
      assert(
        profile.professionalContentTranslations.length === 0,
        'S4 must remain legacy-only with zero translations',
      );
    }

    if (fixture.scenario === 'S5') {
      assert(
        !profile.isPublicProfilePublished && profile.status !== 'APPROVED',
        'S5 must remain non-public and not approved',
      );
    }

    const translationInput = profile.professionalContentTranslations.map(
      (translation) => ({
        locale: translation.locale,
        professionalTitle: translation.professionalTitle,
        bio: translation.bio,
      }),
    );
    const ar = resolver.resolve({
      requestedLocale: ContentLocale.ar,
      primaryContentLocale: profile.primaryContentLocale,
      translations: translationInput,
      legacyProfessionalTitle: profile.professionalTitle,
      legacyBio: profile.bio,
    });
    const en = resolver.resolve({
      requestedLocale: ContentLocale.en,
      primaryContentLocale: profile.primaryContentLocale,
      translations: translationInput,
      legacyProfessionalTitle: profile.professionalTitle,
      legacyBio: profile.bio,
    });

    if (fixture.scenario === 'S1' || fixture.scenario === 'S2') {
      const arExpected = fixture.translations.find(
        (translation) => translation.locale === ContentLocale.ar,
      );
      const enExpected = fixture.translations.find(
        (translation) => translation.locale === ContentLocale.en,
      );
      assert(
        ar.professionalTitle === arExpected?.professionalTitle &&
          ar.bio === arExpected?.bio,
        `${fixture.scenario} AR resolver projection drift`,
      );
      assert(
        en.professionalTitle === enExpected?.professionalTitle &&
          en.bio === enExpected?.bio,
        `${fixture.scenario} EN resolver projection drift`,
      );
    }

    if (fixture.scenario === 'S3') {
      assert(
        en.professionalTitle ===
          'Family support specialist — BLOC2F2_EN_TITLE_S3' &&
          en.bio === fixture.bio,
        'S3 must resolve EN title and independently fall back to legacy bio',
      );
    }

    if (fixture.scenario === 'S4') {
      assert(
        ar.professionalTitle === fixture.professionalTitle &&
          ar.bio === fixture.bio &&
          en.professionalTitle === fixture.professionalTitle &&
          en.bio === fixture.bio,
        'S4 must resolve legacy content for both locales',
      );
    }

    return {
      scenario: fixture.scenario,
      userId: profile.userId,
      profileId: profile.id,
      slug: profile.publicSlug,
      primaryContentLocale: profile.primaryContentLocale,
      status: profile.status,
      isPublicProfilePublished: profile.isPublicProfilePublished,
      acceptsPackages: profile.acceptsPackages,
      translationRows: profile.professionalContentTranslations.map(
        (translation) => ({
          locale: translation.locale,
          professionalTitle: translation.professionalTitle,
          bio: translation.bio,
        }),
      ),
      resolver: { ar, en },
    };
  });

  const translationRowCount = normalized.reduce(
    (count, fixture) => count + fixture.translationRows.length,
    0,
  );
  assert(
    translationRowCount === 10,
    `expected 10 translation rows, found ${translationRowCount}`,
  );
  assert(
    normalized.filter((fixture) => fixture.isPublicProfilePublished).length ===
      5,
    'expected five public fixture profiles',
  );
  assert(
    normalized.filter((fixture) => fixture.acceptsPackages).length === 5,
    'expected five package-enabled fixture profiles, including hidden S5',
  );

  const summary = {
    status: 'PASS',
    fixtureCount: normalized.length,
    translationRowCount,
    profiles: normalized,
  };
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

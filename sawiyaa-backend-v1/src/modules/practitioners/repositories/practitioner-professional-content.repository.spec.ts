import { PractitionerProfessionalContentRepository } from './practitioner-professional-content.repository';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('PractitionerProfessionalContentRepository', () => {
  it('loads legacy fields and all locale rows in one query', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      primaryContentLocale: null,
      professionalTitle: 'Legacy title',
      bio: 'Legacy bio',
      professionalContentTranslations: [
        { locale: 'ar', professionalTitle: 'اختصاصي', bio: null },
      ],
    });
    const prisma = {
      practitionerProfile: { findUnique },
    };
    const repository = new PractitionerProfessionalContentRepository(
      prisma as never,
    );

    await expect(
      repository.findByPractitionerProfileId('practitioner-id'),
    ).resolves.toMatchObject({
      professionalTitle: 'Legacy title',
      bio: 'Legacy bio',
      professionalContentTranslations: [
        { locale: 'ar', professionalTitle: 'اختصاصي', bio: null },
      ],
    });
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('loads multiple profiles with one batch query and avoids an empty query', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      practitionerProfile: { findMany },
    };
    const repository = new PractitionerProfessionalContentRepository(
      prisma as never,
    );

    await expect(
      repository.findByPractitionerProfileIds(['one', 'two']),
    ).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledTimes(1);

    await expect(repository.findByPractitionerProfileIds([])).resolves.toEqual(
      [],
    );
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('keeps the storage constraints additive and supports partial drafts', () => {
    const migrationSql = readFileSync(
      join(
        process.cwd(),
        'prisma/migrations/20260817100000_add_practitioner_professional_content/migration.sql',
      ),
      'utf8',
    );

    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "PractitionerProfileTranslation_practitionerProfileId_locale_key"',
    );
    expect(migrationSql).toContain('ON DELETE CASCADE ON UPDATE CASCADE');
    expect(migrationSql).toContain('"professionalTitle" VARCHAR(191)');
    expect(migrationSql).toContain('"bio" VARCHAR(4000)');
    expect(migrationSql).toContain(
      'ADD COLUMN "primaryContentLocale" "ContentLocale"',
    );
    expect(migrationSql).not.toContain('DROP COLUMN');
    expect(migrationSql).not.toContain('UPDATE "PractitionerProfile"');
  });
});

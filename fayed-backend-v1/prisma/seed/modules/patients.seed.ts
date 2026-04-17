import { PrismaClient } from '@prisma/client';
import { seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';
import { daysAgo } from '../shared/seed.utils';

/**
 * Patients seed module owns patient-profile baseline records.
 * It uses SQL upsert to stay backward-compatible with databases that may not yet include
 * the optional `onboardingCompletedAt` column migration.
 */
export const patientsSeedModule: SeedModule = {
  name: 'patients',
  async run(prisma: PrismaClient): Promise<void> {
    const hasOnboardingColumnResult = (await prisma.$queryRawUnsafe<
      Array<{ exists: boolean }>
    >(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'PatientProfile'
           AND column_name = 'onboardingCompletedAt'
       ) as "exists"`,
    ))[0];

    const hasOnboardingColumn = Boolean(hasOnboardingColumnResult?.exists);

    const rows = [
      {
        id: seedIds.patientProfiles.patientA,
        userId: seedIds.users.patientA,
        countryId: seedIds.countries.egypt,
        displayName: 'Patient One',
        gender: 'FEMALE',
        dateOfBirth: new Date('1995-04-12'),
        onboardingCompletedAt: daysAgo(20),
      },
      {
        id: seedIds.patientProfiles.patientB,
        userId: seedIds.users.patientB,
        countryId: seedIds.countries.uae,
        displayName: 'Patient Two',
        gender: 'MALE',
        dateOfBirth: new Date('1991-09-03'),
        onboardingCompletedAt: null,
      },
    ];

    for (const row of rows) {
      if (hasOnboardingColumn) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "PatientProfile"
            ("id","userId","countryId","displayName","gender","dateOfBirth","onboardingCompletedAt","createdAt","updatedAt")
           VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::date,$7,NOW(),NOW())
           ON CONFLICT ("userId")
           DO UPDATE SET
             "countryId" = EXCLUDED."countryId",
             "displayName" = EXCLUDED."displayName",
             "gender" = EXCLUDED."gender",
             "dateOfBirth" = EXCLUDED."dateOfBirth",
             "onboardingCompletedAt" = EXCLUDED."onboardingCompletedAt",
             "updatedAt" = NOW()`,
          row.id,
          row.userId,
          row.countryId,
          row.displayName,
          row.gender,
          row.dateOfBirth,
          row.onboardingCompletedAt,
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "PatientProfile"
            ("id","userId","countryId","displayName","gender","dateOfBirth","createdAt","updatedAt")
           VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::date,NOW(),NOW())
           ON CONFLICT ("userId")
           DO UPDATE SET
             "countryId" = EXCLUDED."countryId",
             "displayName" = EXCLUDED."displayName",
             "gender" = EXCLUDED."gender",
             "dateOfBirth" = EXCLUDED."dateOfBirth",
             "updatedAt" = NOW()`,
          row.id,
          row.userId,
          row.countryId,
          row.displayName,
          row.gender,
          row.dateOfBirth,
        );
      }
    }
  },
};

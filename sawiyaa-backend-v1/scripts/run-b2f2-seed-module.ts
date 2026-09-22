import { PrismaClient } from '@prisma/client';
import { professionalContentFixturesSeedModule } from '../prisma/seed/modules/professional-content-fixtures.seed';

const prisma = new PrismaClient();

professionalContentFixturesSeedModule
  .run(prisma)
  .then(() => console.log('BLOC-2F2 seed module completed'))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

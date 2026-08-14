import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { assertProductionDatabaseTarget } from './production-baseline.policy';
import { seedProductionBaseline } from '../seed/production-baseline.seed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  assertProductionDatabaseTarget({
    appEnv: process.env.APP_ENV ?? process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    allowSeed: process.env.ALLOW_PRODUCTION_BASELINE_SEED,
  });
  const summary = await seedProductionBaseline(prisma);
  console.log('PRODUCTION_BASELINE_SEED_COMPLETE');
  console.log(JSON.stringify(summary));
}

void main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Production baseline seed failed.');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

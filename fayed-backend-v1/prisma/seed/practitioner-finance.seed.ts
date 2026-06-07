import { PrismaClient } from '@prisma/client';
import { practitionerFinanceSeedModule } from './modules/practitioner-finance.seed';

function assertSafeDatabaseUrl(): void {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  const normalized = databaseUrl.toLowerCase();

  const isSafeLocalTarget =
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('fayed_db');

  if (!databaseUrl || !isSafeLocalTarget) {
    throw new Error(
      'Refusing to run practitioner finance seed unless DATABASE_URL points to the local fayed_db / localhost database.',
    );
  }
}

const prisma = new PrismaClient();

async function main(): Promise<void> {
  assertSafeDatabaseUrl();
  console.log('Starting practitioner finance seed...');
  await practitionerFinanceSeedModule.run(prisma);
  console.log('Practitioner finance seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Practitioner finance seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

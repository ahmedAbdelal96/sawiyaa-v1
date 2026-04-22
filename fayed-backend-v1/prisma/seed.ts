import { PrismaClient } from '@prisma/client';
import { adminSeedModule } from './seed/modules/admin.seed';
import { accountingSeedModule } from './seed/modules/accounting.seed';
import { assessmentsSeedModule } from './seed/modules/assessments.seed';
import { auditEventsSeedModule } from './seed/modules/audit-events.seed';
import { authSeedModule } from './seed/modules/auth.seed';
import { configSeedModule } from './seed/modules/config.seed';
import { notificationsSeedModule } from './seed/modules/notifications.seed';
import { patientsSeedModule } from './seed/modules/patients.seed';
import { practitionersSeedModule } from './seed/modules/practitioners.seed';
import { referenceDataSeedModule } from './seed/modules/reference-data.seed';
import { regionalBulkSeedModule } from './seed/modules/regional-bulk.seed';
import { settlementsLabSeedModule } from './seed/modules/settlements-lab.seed';
import { specialtiesSeedModule } from './seed/modules/specialties.seed';
import { usersSeedModule } from './seed/modules/users.seed';
import { SeedModule } from './seed/shared/seed.types';

const prisma = new PrismaClient();

/**
 * Root seed orchestrator.
 * This file should stay small and only coordinate module seeds in deterministic order.
 */
const seedModules: SeedModule[] = [
  usersSeedModule,
  authSeedModule,
  referenceDataSeedModule,
  specialtiesSeedModule,
  assessmentsSeedModule,
  patientsSeedModule,
  practitionersSeedModule,
  adminSeedModule,
  notificationsSeedModule,
  configSeedModule,
  regionalBulkSeedModule,
  settlementsLabSeedModule,
  accountingSeedModule,
  auditEventsSeedModule,
];

async function main(): Promise<void> {
  console.log('Starting modular seed process...');

  for (const module of seedModules) {
    const startedAt = Date.now();
    console.log(`[seed:${module.name}] started`);
    await module.run(prisma);
    const durationMs = Date.now() - startedAt;
    console.log(`[seed:${module.name}] completed in ${durationMs}ms`);
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

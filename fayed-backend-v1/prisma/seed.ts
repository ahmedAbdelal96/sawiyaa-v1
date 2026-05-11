import { adminSeedModule } from './seed/modules/admin.seed';
import { accountingSeedModule } from './seed/modules/accounting.seed';
import { assessmentsSeedModule } from './seed/modules/assessments.seed';
import { auditEventsSeedModule } from './seed/modules/audit-events.seed';
import { authSeedModule } from './seed/modules/auth.seed';
import { configSeedModule } from './seed/modules/config.seed';
import { financialRulesSeedModule } from './seed/modules/financial-rules.seed';
import { notificationsSeedModule } from './seed/modules/notifications.seed';
import { refundPoliciesSeedModule } from './seed/modules/refund-policies.seed';
import { patientsSeedModule } from './seed/modules/patients.seed';
import { packagePlansSeedModule } from './seed/modules/package-plans.seed';
import { helpSeedModule } from './seed/modules/help.seed';
import { curatedDevSeedModule } from './seed/modules/curated-dev.seed';
import { practitionersSeedModule } from './seed/modules/practitioners.seed';
import { referenceDataSeedModule } from './seed/modules/reference-data.seed';
import { regionalBulkSeedModule } from './seed/modules/regional-bulk.seed';
import { settlementsLabSeedModule } from './seed/modules/settlements-lab.seed';
import { specialtiesSeedModule } from './seed/modules/specialties.seed';
import { usersSeedModule } from './seed/modules/users.seed';
import { PrismaClient } from '@prisma/client';
import { SeedModule } from './seed/shared/seed.types';

const prisma = new PrismaClient();
const seedProfile = (process.env.SEED_PROFILE ?? 'curated').toLowerCase();

/**
 * Root seed orchestrator.
 * This file should stay small and only coordinate module seeds in deterministic order.
 */
const curatedSeedModules: SeedModule[] = [
  usersSeedModule,
  authSeedModule,
  referenceDataSeedModule,
  specialtiesSeedModule,
  assessmentsSeedModule,
  patientsSeedModule,
  practitionersSeedModule,
  packagePlansSeedModule,
  helpSeedModule,
  refundPoliciesSeedModule,
  adminSeedModule,
  notificationsSeedModule,
  configSeedModule,
  financialRulesSeedModule,
  curatedDevSeedModule,
];

const bulkSeedModules: SeedModule[] =
  seedProfile === 'bulk'
    ? [
        regionalBulkSeedModule,
        settlementsLabSeedModule,
        accountingSeedModule,
        auditEventsSeedModule,
      ]
    : [];

const seedModules: SeedModule[] = [
  ...curatedSeedModules,
  ...bulkSeedModules,
];

async function main(): Promise<void> {
  console.log(`Starting modular seed process (profile=${seedProfile})...`);

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

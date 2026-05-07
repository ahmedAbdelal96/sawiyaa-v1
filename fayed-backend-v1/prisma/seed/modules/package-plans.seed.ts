import { Prisma, PrismaClient } from '@prisma/client';
import { STANDARD_PACKAGE_PLANS } from '../../../src/modules/package-plans/package-plan.catalog';
import { SeedModule } from '../shared/seed.types';

export const packagePlansSeedModule: SeedModule = {
  name: 'package-plans',
  async run(prisma: PrismaClient): Promise<void> {
    for (const plan of STANDARD_PACKAGE_PLANS) {
      await prisma.packagePlan.upsert({
        where: { code: plan.code },
        create: {
          code: plan.code,
          sessionCount: plan.sessionCount,
          discountPercent: plan.discountPercent,
          isActive: true,
          sortOrder: plan.sortOrder,
          title: plan.title,
          description: plan.description,
          archivedAt: null,
          metadataJson: plan.metadataJson as Prisma.InputJsonValue,
        },
        update: {
          sessionCount: plan.sessionCount,
          discountPercent: plan.discountPercent,
          isActive: true,
          sortOrder: plan.sortOrder,
          title: plan.title,
          description: plan.description,
          archivedAt: null,
          metadataJson: plan.metadataJson as Prisma.InputJsonValue,
        },
      });
    }
  },
};

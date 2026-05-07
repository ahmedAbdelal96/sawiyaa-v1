"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packagePlansSeedModule = void 0;
const package_plan_catalog_1 = require("../../../src/modules/package-plans/package-plan.catalog");
exports.packagePlansSeedModule = {
    name: 'package-plans',
    async run(prisma) {
        for (const plan of package_plan_catalog_1.STANDARD_PACKAGE_PLANS) {
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
                    metadataJson: plan.metadataJson,
                },
                update: {
                    sessionCount: plan.sessionCount,
                    discountPercent: plan.discountPercent,
                    isActive: true,
                    sortOrder: plan.sortOrder,
                    title: plan.title,
                    description: plan.description,
                    archivedAt: null,
                    metadataJson: plan.metadataJson,
                },
            });
        }
    },
};
//# sourceMappingURL=package-plans.seed.js.map
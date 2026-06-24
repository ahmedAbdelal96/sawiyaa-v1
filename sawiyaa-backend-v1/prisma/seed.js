"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_seed_1 = require("./seed/modules/admin.seed");
const accounting_seed_1 = require("./seed/modules/accounting.seed");
const assessments_seed_1 = require("./seed/modules/assessments.seed");
const audit_events_seed_1 = require("./seed/modules/audit-events.seed");
const auth_seed_1 = require("./seed/modules/auth.seed");
const config_seed_1 = require("./seed/modules/config.seed");
const financial_rules_seed_1 = require("./seed/modules/financial-rules.seed");
const notifications_seed_1 = require("./seed/modules/notifications.seed");
const refund_policies_seed_1 = require("./seed/modules/refund-policies.seed");
const patients_seed_1 = require("./seed/modules/patients.seed");
const package_plans_seed_1 = require("./seed/modules/package-plans.seed");
const practitioners_seed_1 = require("./seed/modules/practitioners.seed");
const reference_data_seed_1 = require("./seed/modules/reference-data.seed");
const regional_bulk_seed_1 = require("./seed/modules/regional-bulk.seed");
const settlements_lab_seed_1 = require("./seed/modules/settlements-lab.seed");
const specialties_seed_1 = require("./seed/modules/specialties.seed");
const users_seed_1 = require("./seed/modules/users.seed");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const seedModules = [
    users_seed_1.usersSeedModule,
    auth_seed_1.authSeedModule,
    reference_data_seed_1.referenceDataSeedModule,
    specialties_seed_1.specialtiesSeedModule,
    assessments_seed_1.assessmentsSeedModule,
    patients_seed_1.patientsSeedModule,
    practitioners_seed_1.practitionersSeedModule,
    package_plans_seed_1.packagePlansSeedModule,
    refund_policies_seed_1.refundPoliciesSeedModule,
    admin_seed_1.adminSeedModule,
    notifications_seed_1.notificationsSeedModule,
    config_seed_1.configSeedModule,
    financial_rules_seed_1.financialRulesSeedModule,
    regional_bulk_seed_1.regionalBulkSeedModule,
    settlements_lab_seed_1.settlementsLabSeedModule,
    accounting_seed_1.accountingSeedModule,
    audit_events_seed_1.auditEventsSeedModule,
];
async function main() {
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
//# sourceMappingURL=seed.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientsSeedModule = void 0;
const seed_constants_1 = require("../shared/seed.constants");
const seed_utils_1 = require("../shared/seed.utils");
exports.patientsSeedModule = {
    name: 'patients',
    async run(prisma) {
        const hasOnboardingColumnResult = (await prisma.$queryRawUnsafe(`SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'PatientProfile'
           AND column_name = 'onboardingCompletedAt'
       ) as "exists"`))[0];
        const hasOnboardingColumn = Boolean(hasOnboardingColumnResult?.exists);
        const rows = [
            {
                id: seed_constants_1.seedIds.patientProfiles.patientA,
                userId: seed_constants_1.seedIds.users.patientA,
                countryId: seed_constants_1.seedIds.countries.egypt,
                displayName: 'Patient One',
                gender: 'FEMALE',
                dateOfBirth: new Date('1995-04-12'),
                onboardingCompletedAt: (0, seed_utils_1.daysAgo)(20),
            },
            {
                id: seed_constants_1.seedIds.patientProfiles.patientB,
                userId: seed_constants_1.seedIds.users.patientB,
                countryId: seed_constants_1.seedIds.countries.uae,
                displayName: 'Patient Two',
                gender: 'MALE',
                dateOfBirth: new Date('1991-09-03'),
                onboardingCompletedAt: null,
            },
        ];
        for (const row of rows) {
            if (hasOnboardingColumn) {
                await prisma.$executeRawUnsafe(`INSERT INTO "PatientProfile"
            ("id","userId","countryId","displayName","gender","dateOfBirth","onboardingCompletedAt","createdAt","updatedAt")
           VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::date,$7,NOW(),NOW())
           ON CONFLICT ("userId")
           DO UPDATE SET
             "countryId" = EXCLUDED."countryId",
             "displayName" = EXCLUDED."displayName",
             "gender" = EXCLUDED."gender",
             "dateOfBirth" = EXCLUDED."dateOfBirth",
             "onboardingCompletedAt" = EXCLUDED."onboardingCompletedAt",
             "updatedAt" = NOW()`, row.id, row.userId, row.countryId, row.displayName, row.gender, row.dateOfBirth, row.onboardingCompletedAt);
            }
            else {
                await prisma.$executeRawUnsafe(`INSERT INTO "PatientProfile"
            ("id","userId","countryId","displayName","gender","dateOfBirth","createdAt","updatedAt")
           VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::date,NOW(),NOW())
           ON CONFLICT ("userId")
           DO UPDATE SET
             "countryId" = EXCLUDED."countryId",
             "displayName" = EXCLUDED."displayName",
             "gender" = EXCLUDED."gender",
             "dateOfBirth" = EXCLUDED."dateOfBirth",
             "updatedAt" = NOW()`, row.id, row.userId, row.countryId, row.displayName, row.gender, row.dateOfBirth);
            }
        }
    },
};
//# sourceMappingURL=patients.seed.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSeedModule = void 0;
const client_1 = require("@prisma/client");
const seed_constants_1 = require("../shared/seed.constants");
exports.adminSeedModule = {
    name: 'admin',
    async run(prisma) {
        const alignments = [
            {
                applicationId: seed_constants_1.seedIds.practitionerApplications.practitionerA,
                practitionerProfileId: seed_constants_1.seedIds.practitionerProfiles.practitionerA,
                applicationStatus: client_1.PractitionerApplicationStatus.SUBMITTED,
                profileStatus: client_1.PractitionerStatus.PENDING_REVIEW,
            },
            {
                applicationId: seed_constants_1.seedIds.practitionerApplications.practitionerB,
                practitionerProfileId: seed_constants_1.seedIds.practitionerProfiles.practitionerB,
                applicationStatus: client_1.PractitionerApplicationStatus.APPROVED,
                profileStatus: client_1.PractitionerStatus.APPROVED,
            },
            {
                applicationId: seed_constants_1.seedIds.practitionerApplications.practitionerC,
                practitionerProfileId: seed_constants_1.seedIds.practitionerProfiles.practitionerC,
                applicationStatus: client_1.PractitionerApplicationStatus.REJECTED,
                profileStatus: client_1.PractitionerStatus.REJECTED,
            },
            {
                applicationId: seed_constants_1.seedIds.practitionerApplications.practitionerD,
                practitionerProfileId: seed_constants_1.seedIds.practitionerProfiles.practitionerD,
                applicationStatus: client_1.PractitionerApplicationStatus.UNDER_REVIEW,
                profileStatus: client_1.PractitionerStatus.PENDING_REVIEW,
            },
        ];
        for (const alignment of alignments) {
            await prisma.practitionerApplication.update({
                where: { id: alignment.applicationId },
                data: {
                    status: alignment.applicationStatus,
                },
            });
            await prisma.practitionerProfile.update({
                where: { id: alignment.practitionerProfileId },
                data: {
                    status: alignment.profileStatus,
                },
            });
        }
    },
};
//# sourceMappingURL=admin.seed.js.map
import { PractitionerApplicationStatus, PractitionerStatus, PrismaClient } from '@prisma/client';
import { seedIds } from '../shared/seed.constants';
import { SeedModule } from '../shared/seed.types';

/**
 * Admin seed module keeps explicit review-state fixtures aligned with practitioner profile status.
 * This module helps test admin review decisions without mixing logic into practitioner seed internals.
 */
export const adminSeedModule: SeedModule = {
  name: 'admin',
  async run(prisma: PrismaClient): Promise<void> {
    const alignments: Array<{
      applicationId: string;
      practitionerProfileId: string;
      applicationStatus: PractitionerApplicationStatus;
      profileStatus: PractitionerStatus;
    }> = [
      {
        applicationId: seedIds.practitionerApplications.practitionerA,
        practitionerProfileId: seedIds.practitionerProfiles.practitionerA,
        applicationStatus: PractitionerApplicationStatus.SUBMITTED,
        profileStatus: PractitionerStatus.PENDING_REVIEW,
      },
      {
        applicationId: seedIds.practitionerApplications.practitionerB,
        practitionerProfileId: seedIds.practitionerProfiles.practitionerB,
        applicationStatus: PractitionerApplicationStatus.APPROVED,
        profileStatus: PractitionerStatus.APPROVED,
      },
      {
        applicationId: seedIds.practitionerApplications.practitionerC,
        practitionerProfileId: seedIds.practitionerProfiles.practitionerC,
        applicationStatus: PractitionerApplicationStatus.REJECTED,
        profileStatus: PractitionerStatus.REJECTED,
      },
      {
        applicationId: seedIds.practitionerApplications.practitionerD,
        practitionerProfileId: seedIds.practitionerProfiles.practitionerD,
        applicationStatus: PractitionerApplicationStatus.UNDER_REVIEW,
        profileStatus: PractitionerStatus.PENDING_REVIEW,
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

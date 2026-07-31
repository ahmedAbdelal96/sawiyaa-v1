import 'dotenv/config';
import { PrismaClient, PractitionerApplicationStatus, PractitionerStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  if (args.some((arg) => arg !== '--apply' && arg !== '--dry-run')) {
    throw new Error('Use --dry-run (default) or --apply.');
  }

  const profiles = await prisma.practitionerProfile.findMany({
    where: { status: PractitionerStatus.APPROVED },
    select: {
      id: true,
      credentials: {
        where: { reviewStatus: 'PENDING' },
        select: { id: true, credentialType: true, reviewStatus: true },
      },
      applications: {
        where: {
          status: {
            in: [
              PractitionerApplicationStatus.SUBMITTED,
              PractitionerApplicationStatus.UNDER_REVIEW,
              PractitionerApplicationStatus.CHANGES_REQUESTED,
            ],
          },
        },
        select: { id: true },
      },
    },
  });

  const candidates = profiles.filter((profile) => profile.credentials.length > 0 && profile.applications.length === 0);
  const ambiguous = profiles.filter((profile) => profile.applications.length > 1);

  for (const profile of candidates) {
    const snapshot = {
      review: { sections: ['CREDENTIALS'], changedAt: new Date().toISOString(), source: 'development-reconciliation' },
      credentials: profile.credentials.map((credential) => ({
        credentialId: credential.id,
        credentialType: credential.credentialType,
        reviewStatus: credential.reviewStatus,
      })),
    };
    if (apply) {
      await prisma.practitionerApplication.create({
        data: {
          practitionerId: profile.id,
          status: PractitionerApplicationStatus.SUBMITTED,
          submittedAt: new Date(),
          submissionSnapshot: snapshot,
        },
      });
    }
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    candidates: candidates.length,
    reconciled: apply ? candidates.length : 0,
    ambiguous: ambiguous.map((profile) => ({ practitionerId: profile.id, activeRequestCount: profile.applications.length })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());

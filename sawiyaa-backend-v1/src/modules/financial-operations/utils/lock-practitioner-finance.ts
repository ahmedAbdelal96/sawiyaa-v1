import { Prisma } from '@prisma/client';

/** Shared order: payment/entitlement, practitioner, settlement. */
export async function lockPractitionerFinance(
  tx: Prisma.TransactionClient,
  practitionerId: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`practitioner-finance:${practitionerId}`})::bigint)`;
}

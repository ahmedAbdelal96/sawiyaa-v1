import { AcademyRegistrationAttemptStatus, PrismaClient } from '../../src/generated/prisma';

const prisma = new PrismaClient();

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function normalizePhone(value: string) {
  return value.replace(/[\s().-]/g, '').trim();
}

function resolveStatus(input: {
  status: string;
  paymentStatus: string;
}) {
  if (input.status === 'CONFIRMED' && input.paymentStatus === 'CAPTURED') {
    return AcademyRegistrationAttemptStatus.CONVERTED;
  }

  if (input.paymentStatus === 'FAILED' || input.paymentStatus === 'EXPIRED') {
    return AcademyRegistrationAttemptStatus.PAYMENT_ISSUE;
  }

  return AcademyRegistrationAttemptStatus.PENDING_PAYMENT;
}

async function main() {
  const enrollments = await prisma.academyProgramEnrollment.findMany({
    select: {
      id: true,
      academyProgramId: true,
      academyLearnerId: true,
      userId: true,
      status: true,
      paymentStatus: true,
      contactFullName: true,
      contactPhone: true,
      contactWhatsapp: true,
      contactEmail: true,
      contactNotes: true,
      registeredAt: true,
      confirmedAt: true,
      academyLearner: {
        select: {
          fullName: true,
          phoneNumber: true,
          whatsappNumber: true,
          email: true,
          sourceLabel: true,
        },
      },
    },
  });

  let created = 0;
  let updated = 0;

  for (const enrollment of enrollments) {
    const email = normalizeEmail(
      enrollment.academyLearner.email ?? enrollment.contactEmail,
    );
    const phone =
      enrollment.academyLearner.phoneNumber || enrollment.contactPhone;
    const status = resolveStatus(enrollment);
    const idempotencyKey = `backfill:${enrollment.id}`;
    const existing = await prisma.academyRegistrationAttempt.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    const result = await prisma.academyRegistrationAttempt.upsert({
      where: { idempotencyKey },
      update: {
        academyLearnerId: enrollment.academyLearnerId,
        academyEnrollmentId: enrollment.id,
        userId: enrollment.userId,
        status,
        convertedAt: status === AcademyRegistrationAttemptStatus.CONVERTED
          ? enrollment.confirmedAt ?? enrollment.registeredAt
          : null,
      },
      create: {
        academyProgramId: enrollment.academyProgramId,
        academyLearnerId: enrollment.academyLearnerId,
        academyEnrollmentId: enrollment.id,
        userId: enrollment.userId,
        idempotencyKey,
        fullName: enrollment.contactFullName || enrollment.academyLearner.fullName,
        phoneNumber: enrollment.contactPhone || phone,
        normalizedPhoneNumber: normalizePhone(phone),
        whatsappNumber:
          enrollment.contactWhatsapp ?? enrollment.academyLearner.whatsappNumber,
        email: enrollment.contactEmail ?? enrollment.academyLearner.email,
        normalizedEmail: email,
        sourceLabel:
          enrollment.academyLearner.sourceLabel ?? enrollment.contactNotes,
        status,
        resolution: enrollment.userId
          ? 'AUTHENTICATED_ACCOUNT'
          : 'EXISTING_LEARNER',
        createdAt: enrollment.registeredAt,
        convertedAt: status === AcademyRegistrationAttemptStatus.CONVERTED
          ? enrollment.confirmedAt ?? enrollment.registeredAt
          : null,
      },
    });

    if (existing) updated += 1;
    else created += 1;
  }

  console.log(
    JSON.stringify({
      backfilled: enrollments.length,
      created,
      updated,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

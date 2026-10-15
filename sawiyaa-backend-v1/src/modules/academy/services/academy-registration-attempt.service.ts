import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class AcademyRegistrationAttemptService {
  constructor(private readonly prisma: PrismaService) {}

  async start(input: {
    academyProgramId: string;
    idempotencyKey?: string | null;
    fullName: string;
    phoneNumber: string;
    whatsappNumber?: string | null;
    email?: string | null;
    sourceLabel?: string | null;
    paymentMethod?: string | null;
  }) {
    const idempotencyKey = this.normalizeIdempotencyKey(input.idempotencyKey);
    const normalizedEmail = this.normalizeEmail(input.email);
    const normalizedPhoneNumber = this.normalizePhone(input.phoneNumber);

    const attempt = await this.prisma.academyRegistrationAttempt.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        academyProgramId: input.academyProgramId,
        idempotencyKey,
        fullName: input.fullName.trim(),
        phoneNumber: input.phoneNumber.trim(),
        normalizedPhoneNumber,
        whatsappNumber: input.whatsappNumber?.trim() || null,
        email: input.email?.trim() || null,
        normalizedEmail,
        sourceLabel: input.sourceLabel?.trim() || null,
        paymentMethod: input.paymentMethod ?? null,
      },
    });

    if (attempt.academyProgramId !== input.academyProgramId) {
      throw new ConflictException({
        messageKey: 'academy.errors.registrationAttemptConflict',
        error: 'ACADEMY_REGISTRATION_ATTEMPT_SCOPE_CONFLICT',
      });
    }

    return attempt;
  }

  markRequiresLogin(id: string) {
    return this.update(id, {
      status: 'REQUIRES_LOGIN',
      resolution: 'EXISTING_ACCOUNT_REQUIRES_LOGIN',
    });
  }

  markLearnerResolved(input: {
    id: string;
    learnerId: string;
    userId?: string | null;
    resolution:
      | 'EXISTING_LEARNER'
      | 'AUTHENTICATED_ACCOUNT'
      | 'NEW_GUEST';
  }) {
    return this.update(input.id, {
      academyLearnerId: input.learnerId,
      userId: input.userId ?? null,
      resolution: input.resolution,
    });
  }

  markPendingPayment(input: { id: string; enrollmentId: string }) {
    return this.update(input.id, {
      academyEnrollmentId: input.enrollmentId,
      status: 'PENDING_PAYMENT',
    });
  }

  markConverted(input: { id: string; enrollmentId: string }) {
    return this.update(input.id, {
      academyEnrollmentId: input.enrollmentId,
      status: 'CONVERTED',
      convertedAt: new Date(),
    });
  }

  markPaymentIssue(input: { id: string; enrollmentId: string }) {
    return this.update(input.id, {
      academyEnrollmentId: input.enrollmentId,
      status: 'PAYMENT_ISSUE',
    });
  }

  markDuplicate(input: { id: string; enrollmentId: string }) {
    return this.update(input.id, {
      academyEnrollmentId: input.enrollmentId,
      status: 'DUPLICATE',
      resolution: 'EXISTING_ENROLLMENT',
    });
  }

  private update(
    id: string,
    data: Prisma.AcademyRegistrationAttemptUncheckedUpdateInput,
  ) {
    return this.prisma.academyRegistrationAttempt.update({
      where: { id },
      data,
    });
  }

  private normalizeIdempotencyKey(value?: string | null) {
    const normalized = value?.trim();
    return normalized && normalized.length <= 120 ? normalized : randomUUID();
  }

  private normalizeEmail(value?: string | null) {
    const normalized = value?.trim().toLowerCase();
    return normalized || null;
  }

  private normalizePhone(value: string) {
    return value.replace(/[\s().-]/g, '').trim();
  }
}

import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';
import { SessionLifecycleService } from './session-lifecycle.service';

/**
 * Conflict validation remains a separate service so Sessions can consume availability-derived windows
 * while also enforcing booking collisions without embedding that logic inside controllers or repositories.
 */
@Injectable()
export class ValidateSessionConflictsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionRepository: SessionRepository,
    private readonly lifecycle: SessionLifecycleService,
  ) {}

  async assertNoPractitionerConflict(input: {
    practitionerId: string;
    scheduledStartAtUtc: Date;
    scheduledEndAtUtc: Date;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const candidates = await this.sessionRepository.listExpiredPendingPaymentSessionsInRangeForPractitioner(
      {
        practitionerId: input.practitionerId,
        startsBefore: input.scheduledEndAtUtc,
        endsAfter: input.scheduledStartAtUtc,
        now: new Date(),
        tx: input.tx,
      },
    );
    await this.expireCandidates(candidates, input.tx);

    const conflicts =
      await this.sessionRepository.listSessionsInRangeForPractitioner(
        input.practitionerId,
        input.scheduledEndAtUtc,
        input.scheduledStartAtUtc,
        input.tx,
      );

    if (conflicts.length > 0) {
      throw new ConflictException({
        messageKey: 'sessions.errors.practitionerTimeConflict',
        error: 'SESSION_PRACTITIONER_TIME_CONFLICT',
      });
    }
  }

  async assertNoPatientConflict(input: {
    patientId: string;
    scheduledStartAtUtc: Date;
    scheduledEndAtUtc: Date;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const candidates = await this.sessionRepository.listExpiredPendingPaymentSessionsInRangeForPatient({
      patientId: input.patientId,
      startsBefore: input.scheduledEndAtUtc,
      endsAfter: input.scheduledStartAtUtc,
      now: new Date(),
      tx: input.tx,
    });
    await this.expireCandidates(candidates, input.tx);

    const conflicts =
      await this.sessionRepository.listSessionsInRangeForPatient(
        input.patientId,
        input.scheduledEndAtUtc,
        input.scheduledStartAtUtc,
        input.tx,
      );

    if (conflicts.length > 0) {
      throw new ConflictException({
        messageKey: 'sessions.errors.patientTimeConflict',
        error: 'SESSION_PATIENT_TIME_CONFLICT',
      });
    }
  }

  private async expireCandidates(
    candidates: Array<{ id: string; status: SessionStatus }>,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (tx) {
      for (const candidate of candidates) {
        await this.lifecycle.transitionIfCurrentStatus({
          sessionId: candidate.id,
          expectedStatuses: [SessionStatus.PENDING_PAYMENT],
          to: SessionStatus.EXPIRED,
          tx,
        });
      }
      return;
    }
    for (const candidate of candidates) {
      await this.prisma.$transaction((transaction) =>
        this.lifecycle.transitionIfCurrentStatus({
          sessionId: candidate.id,
          expectedStatuses: [SessionStatus.PENDING_PAYMENT],
          to: SessionStatus.EXPIRED,
          tx: transaction,
        }),
      );
    }
  }
}

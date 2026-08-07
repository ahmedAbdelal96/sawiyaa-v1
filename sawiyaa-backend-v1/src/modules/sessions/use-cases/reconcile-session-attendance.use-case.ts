import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SessionProvider } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SessionRepository } from '../repositories/session.repository';
import { NormalizeSessionAttendanceReconciliationService } from '../services/normalize-session-attendance-reconciliation.service';
import { SESSION_ATTENDANCE_RECONCILIATION_PROVIDER } from '../providers/session-attendance-reconciliation.tokens';
import type { SessionAttendanceReconciliationProvider } from '../types/session-attendance-reconciliation.types';
import { FinalizeSessionAutomaticallyAsCompletedUseCase } from './finalize-session-automatically-as-completed.use-case';
import { Optional } from '@nestjs/common';

/** Read-only orchestration: evidence is persisted, lifecycle and money are untouched. */
@Injectable()
export class ReconcileSessionAttendanceUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionRepository,
    private readonly normalizer: NormalizeSessionAttendanceReconciliationService,
    @Inject(SESSION_ATTENDANCE_RECONCILIATION_PROVIDER)
    private readonly provider: SessionAttendanceReconciliationProvider,
    @Optional()
    private readonly finalizer?: FinalizeSessionAutomaticallyAsCompletedUseCase,
  ) {}

  async execute(input: { sessionId: string; observationVersion?: number }) {
    const session = await this.sessions.findById(input.sessionId);
    if (!session) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.sessionNotFound',
        error: 'SESSION_NOT_FOUND',
      });
    }
    if (
      !session.providerRoomId ||
      !session.scheduledStartAt ||
      !session.scheduledEndAt
    ) {
      const result = this.normalizer.normalize({
        status: 'UNAVAILABLE',
        provider: SessionProvider.DAILY,
        roomFound: false,
        meetingStarted: null,
        meetingEnded: null,
        patient: {
          identityConfirmed: false,
          joined: false,
          totalPresenceSeconds: 0,
          firstJoinedAt: null,
          lastLeftAt: null,
        },
        practitioner: {
          identityConfirmed: false,
          joined: false,
          totalPresenceSeconds: 0,
          firstJoinedAt: null,
          lastLeftAt: null,
        },
        unknownParticipantCount: 0,
        providerMeetingId: null,
        reconciledAt: new Date(),
        providerDataObservedUntil: null,
        confidence: 'UNTRUSTED',
        reasonCodes: ['EVIDENCE_INCOMPLETE'],
        attemptNumber: 1,
        requestStatus: 'FAILED',
        failureCategory: 'SESSION_PROVIDER_REFERENCE_MISSING',
        eligibleForAutomaticFinalization: false,
      });
    return this.persist(session.id, input.observationVersion ?? 1, result);
    }
    const latest = await this.sessions.findLatestAttendanceReconciliation(
      session.id,
    );
    const observationVersion =
      input.observationVersion ?? (latest?.observationVersion ?? 0) + 1;
    const result = this.normalizer.normalize(
      await this.provider.reconcileSession({
        sessionId: session.id,
        providerRoomName: session.providerRoomId,
        scheduledStartAt: session.scheduledStartAt,
        scheduledEndAt: session.scheduledEndAt,
        patientId: session.patientId,
        practitionerId: session.practitionerId,
      }),
    );
    return this.persist(session.id, observationVersion, {
      ...result,
      attemptNumber: result.attemptNumber || 1,
    });
  }

  private persist(
    sessionId: string,
    observationVersion: number,
    result: Awaited<
      ReturnType<NormalizeSessionAttendanceReconciliationService['normalize']>
    >,
  ) {
    return this.prisma.$transaction((tx) =>
      this.sessions.upsertAttendanceReconciliation(
        {
          sessionId,
          provider: result.provider,
          observationVersion,
          status: result.status,
          roomFound: result.roomFound,
          meetingStarted: result.meetingStarted,
          meetingEnded: result.meetingEnded,
          patientIdentityConfirmed: result.patient.identityConfirmed,
          patientJoined: result.patient.joined,
          patientTotalPresenceSeconds: result.patient.totalPresenceSeconds,
          patientFirstJoinedAt: result.patient.firstJoinedAt,
          patientLastLeftAt: result.patient.lastLeftAt,
          practitionerIdentityConfirmed: result.practitioner.identityConfirmed,
          practitionerJoined: result.practitioner.joined,
          practitionerTotalPresenceSeconds:
            result.practitioner.totalPresenceSeconds,
          practitionerFirstJoinedAt: result.practitioner.firstJoinedAt,
          practitionerLastLeftAt: result.practitioner.lastLeftAt,
          unknownParticipantCount: result.unknownParticipantCount,
          providerMeetingId: result.providerMeetingId,
          reconciledAt: result.reconciledAt,
          providerDataObservedUntil: result.providerDataObservedUntil,
          confidence: result.confidence,
          reasonCodesJson: result.reasonCodes as Prisma.InputJsonValue,
          attemptNumber: result.attemptNumber,
          requestStatus: result.requestStatus,
          failureCategory: result.failureCategory,
          eligibleForAutomaticFinalization:
            result.eligibleForAutomaticFinalization,
        },
        tx,
      ),
    ).then(async (reconciliation) => {
      // Evidence is persisted before evaluation. The finalizer only completes
      // normal sessions; non-normal recommendations are moved to the Admin
      // resolution state and case by the same evaluator/lifecycle path.
      if (
        this.finalizer &&
        process.env.SESSION_AUTOMATIC_COMPLETION_ENABLED === 'true'
      ) {
        await this.finalizer.execute({
          sessionId,
          evaluatedAt: reconciliation.reconciledAt,
          trigger: 'attendance-reconciliation',
        });
      }
      return reconciliation;
    });
  }
}

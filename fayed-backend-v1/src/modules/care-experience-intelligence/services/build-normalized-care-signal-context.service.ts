import { Injectable } from '@nestjs/common';
import { PaymentStatus, SessionStatus } from '@prisma/client';
import { CareSignalContextRepository } from '../repositories/care-signal-context.repository';
import { InterpretAssessmentCareIntentService } from './interpret-assessment-care-intent.service';
import {
  NormalizedCareSignalContext,
  RawCareSignalSnapshot,
} from '../types/care-signal-context.types';

@Injectable()
export class BuildNormalizedCareSignalContextService {
  constructor(
    private readonly repository: CareSignalContextRepository,
    private readonly interpretAssessmentCareIntentService: InterpretAssessmentCareIntentService,
  ) {}

  async buildFromRepository(input: {
    patientProfileId: string;
    userId: string;
    now?: Date;
  }): Promise<NormalizedCareSignalContext> {
    const snapshot = await this.repository.readSnapshot({
      patientProfileId: input.patientProfileId,
      userId: input.userId,
      now: input.now ?? new Date(),
    });
    return this.buildFromSnapshot(snapshot);
  }

  buildFromSnapshot(
    snapshot: RawCareSignalSnapshot,
  ): NormalizedCareSignalContext {
    const rulesApplied: string[] = [];
    const hasPendingPayment = this.isPendingPaymentStatus(
      snapshot.pendingPaymentStatus,
    );
    const hasUpcomingSession = this.isUpcomingSessionStatus(
      snapshot.upcomingSessionStatus,
    );
    const hasCompletedAssessment = Boolean(
      snapshot.latestAssessmentCompletedAt,
    );

    const assessmentInterpretation =
      this.interpretAssessmentCareIntentService.interpret({
        latestAssessmentBand: snapshot.latestAssessmentBand,
        hasCompletedAssessment,
        hasUpcomingSession,
        hasPendingPayment,
      });

    const stage = this.resolveContinuityStage({
      hasPendingPayment,
      hasUpcomingSession,
      hasPastSession: snapshot.hasPastSession,
      hasRecentMatchingSession: snapshot.hasRecentMatchingSession,
      hasActiveTrainingEnrollment: snapshot.hasActiveTrainingEnrollment,
      rulesApplied,
    });

    return {
      profile: {
        patientProfileId: snapshot.patientProfileId,
        userId: snapshot.userId,
        countryCode:
          snapshot.patientCountryIsoCode?.trim().toUpperCase() ?? null,
        timezone: snapshot.userTimezone?.trim() ?? null,
      },
      assessments: {
        hasCompletedAssessment,
        latestBand: snapshot.latestAssessmentBand,
        latestCompletedAt:
          snapshot.latestAssessmentCompletedAt?.toISOString() ?? null,
        interpretation: assessmentInterpretation,
      },
      sessions: {
        hasUpcomingSession,
        upcomingStatus: snapshot.upcomingSessionStatus,
        hasPastSession: snapshot.hasPastSession,
      },
      payments: {
        hasPendingPayment,
        pendingStatus: snapshot.pendingPaymentStatus,
      },
      matching: {
        hasRecentSession: snapshot.hasRecentMatchingSession,
      },
      training: {
        hasActiveEnrollment: snapshot.hasActiveTrainingEnrollment,
      },
      support: {
        hasOpenTicket: snapshot.hasOpenSupportTicket,
        latestOpenTicketStatus: snapshot.latestSupportTicketStatus,
      },
      continuity: {
        stage,
        rulesApplied,
      },
    };
  }

  private isPendingPaymentStatus(status: PaymentStatus | null): boolean {
    return (
      status === PaymentStatus.CREATED ||
      status === PaymentStatus.PENDING ||
      status === PaymentStatus.REQUIRES_ACTION ||
      status === PaymentStatus.AUTHORIZED
    );
  }

  private isUpcomingSessionStatus(status: SessionStatus | null): boolean {
    return (
      status === SessionStatus.PENDING_PAYMENT ||
      status === SessionStatus.PENDING_PRACTITIONER_RESPONSE ||
      status === SessionStatus.CONFIRMED ||
      status === SessionStatus.UPCOMING ||
      status === SessionStatus.READY_TO_JOIN
    );
  }

  private resolveContinuityStage(input: {
    hasPendingPayment: boolean;
    hasUpcomingSession: boolean;
    hasPastSession: boolean;
    hasRecentMatchingSession: boolean;
    hasActiveTrainingEnrollment: boolean;
    rulesApplied: string[];
  }): NormalizedCareSignalContext['continuity']['stage'] {
    if (input.hasPendingPayment) {
      input.rulesApplied.push('PENDING_PAYMENT_BLOCKS_CONTINUITY');
      return 'PAYMENT_BLOCKED';
    }

    if (input.hasUpcomingSession) {
      input.rulesApplied.push('UPCOMING_SESSION_HAS_PRIORITY');
      return 'UPCOMING_SESSION';
    }

    if (input.hasActiveTrainingEnrollment) {
      input.rulesApplied.push('ACTIVE_TRAINING_COUNTS_AS_ACTIVE_CARE');
      return 'ACTIVE_CARE';
    }

    if (input.hasPastSession || input.hasRecentMatchingSession) {
      input.rulesApplied.push('PAST_HISTORY_COUNTS_AS_RETURNING');
      return 'RETURNING';
    }

    input.rulesApplied.push('NO_CONTINUITY_SIGNALS_FOUND');
    return 'NEW';
  }
}

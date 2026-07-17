import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionRepository } from '../repositories/session.repository';
import { summarizeSessionPresentations } from '../utils/session-join-policy.util';

@Injectable()
export class GetMyPatientSessionSummaryUseCase {
  constructor(
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async execute(input: { userId: string }) {
    const patient = await this.sessionPatientRepository.findByUserId(
      input.userId,
    );

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'sessions.errors.patientNotFound',
        error: 'SESSION_PATIENT_NOT_FOUND',
      });
    }

    const sessions =
      await this.sessionRepository.listPatientSessionSummaryCandidates(
        patient.id,
      );

    const presentationSummary = summarizeSessionPresentations(sessions);
    const counts = sessions.reduce<Record<SessionStatus, number>>(
      (acc, session) => {
        acc[session.status] = (acc[session.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<SessionStatus, number>,
    );
    const getCount = (...statuses: SessionStatus[]) =>
      statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);

    return {
      totalItems: presentationSummary.totalItems,
      pendingPayment: counts[SessionStatus.PENDING_PAYMENT] ?? 0,
      pendingPractitionerResponse:
        counts[SessionStatus.PENDING_PRACTITIONER_CONFIRMATION] ?? 0,
      confirmed: counts[SessionStatus.UPCOMING] ?? 0,
      upcoming: presentationSummary.upcoming,
      readyToJoin: presentationSummary.joinable,
      inProgress: presentationSummary.inProgress,
      completed: counts[SessionStatus.COMPLETED] ?? 0,
      cancelled: counts[SessionStatus.CANCELLED] ?? 0,
      noShow: getCount(
        SessionStatus.PATIENT_NO_SHOW,
        SessionStatus.PRACTITIONER_NO_SHOW,
        SessionStatus.BOTH_NO_SHOW,
      ),
      expired: counts[SessionStatus.EXPIRED] ?? 0,
      refundPending: 0,
      refunded: 0,
      actionRequired: getCount(
        SessionStatus.PENDING_PAYMENT,
        SessionStatus.PENDING_PRACTITIONER_CONFIRMATION,
      ) + presentationSummary.joinable,
      active:
        presentationSummary.upcoming +
        presentationSummary.unavailable +
        presentationSummary.joinable +
        presentationSummary.inProgress,
      history: getCount(
        SessionStatus.COMPLETED,
        SessionStatus.CANCELLED,
        SessionStatus.PATIENT_NO_SHOW,
        SessionStatus.PRACTITIONER_NO_SHOW,
        SessionStatus.BOTH_NO_SHOW,
        SessionStatus.EXPIRED,
      ),
      paymentExpired: counts[SessionStatus.EXPIRED] ?? 0,
    };
  }
}

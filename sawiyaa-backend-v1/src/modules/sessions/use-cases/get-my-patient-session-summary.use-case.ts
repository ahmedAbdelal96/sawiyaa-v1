import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { SessionPatientRepository } from '../repositories/session-patient.repository';
import { SessionRepository } from '../repositories/session.repository';
import { SessionOperationalInterpreterService } from '../services/session-operational-interpreter.service';
import { summarizeOperationalStates } from '../utils/session-operational-summary.util';

@Injectable()
export class GetMyPatientSessionSummaryUseCase {
  constructor(
    private readonly sessionPatientRepository: SessionPatientRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly operationalInterpreter: SessionOperationalInterpreterService,
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

    const now = new Date();
    const operational = await Promise.all(sessions.map((session) =>
      this.operationalInterpreter.interpret({ session, actor: 'ADMIN', now }),
    ));
    const { counts, get: getCount } = summarizeOperationalStates(operational.map((item) => item.state));

    return {
      totalItems: sessions.length,
      pendingPayment: counts[SessionStatus.PENDING_PAYMENT] ?? 0,
      pendingPractitionerResponse:
        counts[SessionStatus.PENDING_PRACTITIONER_CONFIRMATION] ?? 0,
      confirmed: counts[SessionStatus.UPCOMING] ?? 0,
      upcoming: counts[SessionStatus.UPCOMING] ?? 0,
      readyToJoin: counts[SessionStatus.READY_TO_JOIN] ?? 0,
      inProgress: counts[SessionStatus.IN_PROGRESS] ?? 0,
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
      ) + (counts[SessionStatus.READY_TO_JOIN] ?? 0),
      active:
        (counts[SessionStatus.UPCOMING] ?? 0) +
        (counts[SessionStatus.READY_TO_JOIN] ?? 0) +
        (counts[SessionStatus.IN_PROGRESS] ?? 0),
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

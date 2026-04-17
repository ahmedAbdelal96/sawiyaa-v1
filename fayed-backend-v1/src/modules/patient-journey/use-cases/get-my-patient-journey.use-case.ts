import { Injectable, NotFoundException } from '@nestjs/common';
import { BuildAssessmentDerivedRecommendationsService } from '@modules/care-experience-intelligence/services/build-assessment-derived-recommendations.service';
import { BuildNormalizedCareSignalContextService } from '@modules/care-experience-intelligence/services/build-normalized-care-signal-context.service';
import { PatientJourneyMapper } from '../mappers/patient-journey.mapper';
import { PatientJourneyPatientRepository } from '../repositories/patient-journey-patient.repository';
import { PatientJourneyReadRepository } from '../repositories/patient-journey-read.repository';
import { BuildPatientJourneyLinkedContentService } from '../services/build-patient-journey-linked-content.service';
import { BuildPatientJourneyNextStepsService } from '../services/build-patient-journey-next-steps.service';

@Injectable()
export class GetMyPatientJourneyUseCase {
  constructor(
    private readonly patientJourneyPatientRepository: PatientJourneyPatientRepository,
    private readonly patientJourneyReadRepository: PatientJourneyReadRepository,
    private readonly buildNormalizedCareSignalContextService: BuildNormalizedCareSignalContextService,
    private readonly buildAssessmentDerivedRecommendationsService: BuildAssessmentDerivedRecommendationsService,
    private readonly buildPatientJourneyNextStepsService: BuildPatientJourneyNextStepsService,
    private readonly buildPatientJourneyLinkedContentService: BuildPatientJourneyLinkedContentService,
    private readonly patientJourneyMapper: PatientJourneyMapper,
  ) {}

  async execute(input: { userId: string }) {
    const patient = await this.patientJourneyPatientRepository.findByUserId(input.userId);

    if (!patient) {
      throw new NotFoundException({
        messageKey: 'patientJourney.errors.patientProfileNotFound',
        error: 'PATIENT_JOURNEY_PATIENT_NOT_FOUND',
      });
    }

    const nowUtc = new Date();

    const [
      upcomingSession,
      pendingInstantBookingRequest,
      latestAssessment,
      latestMatchingSession,
      latestOpenSupportTicket,
      recentPastSessions,
      recentAssessments,
      recentMatching,
      recentPayments,
    ] = await Promise.all([
      this.patientJourneyReadRepository.findUpcomingSession(patient.id, nowUtc),
      this.patientJourneyReadRepository.findPendingInstantBookingRequest(
        patient.id,
        nowUtc,
      ),
      this.patientJourneyReadRepository.findLatestAssessment(patient.id),
      this.patientJourneyReadRepository.findLatestMatchingSession(patient.id),
      this.patientJourneyReadRepository.findLatestOpenSupportTicket(patient.id),
      this.patientJourneyReadRepository.listRecentPastSessions(patient.id, nowUtc, 5),
      this.patientJourneyReadRepository.listRecentAssessments(patient.id, 5),
      this.patientJourneyReadRepository.listRecentMatchingSessions(patient.id, 5),
      this.patientJourneyReadRepository.listRecentPayments(patient.id, 5),
    ]);

    const pendingPayment = await this.patientJourneyReadRepository.findPendingPayment(
      patient.id,
      upcomingSession?.id,
    );

    const normalizedSignalContext =
      await this.buildNormalizedCareSignalContextService.buildFromRepository({
        patientProfileId: patient.id,
        userId: input.userId,
        now: nowUtc,
      });
    const assessmentRecommendations =
      this.buildAssessmentDerivedRecommendationsService.build({
        interpretation: normalizedSignalContext.assessments.interpretation,
        patientProfileId: patient.id,
      });

    const nextSteps = this.buildPatientJourneyNextStepsService.build({
      hasPendingPayment: normalizedSignalContext.payments.hasPendingPayment,
      hasUpcomingSession: normalizedSignalContext.sessions.hasUpcomingSession,
      upcomingSessionStatus:
        normalizedSignalContext.sessions.upcomingStatus ?? upcomingSession?.status,
      hasOpenSupportTicket: normalizedSignalContext.support.hasOpenTicket,
      hasRecentMatching: normalizedSignalContext.matching.hasRecentSession,
      hasAnyAssessment: normalizedSignalContext.assessments.hasCompletedAssessment,
      hasPastSessions: normalizedSignalContext.sessions.hasPastSession,
      hasActiveTrainingEnrollment:
        normalizedSignalContext.training.hasActiveEnrollment,
      continuityStage: normalizedSignalContext.continuity.stage,
      assessmentRecommendations,
    });
    const linkedContent = await this.buildPatientJourneyLinkedContentService.build({
      normalizedContext: normalizedSignalContext,
      suggestedNextAction: nextSteps.suggestedNextAction,
    });

    return {
      item: this.patientJourneyMapper.toViewModel({
        upcomingSession,
        pendingPayment,
        pendingInstantBookingRequest,
        recentPastSessions,
        recentAssessments,
        recentMatching,
        recentPayments,
        latestOpenSupportTicket,
        lastAssessmentTakenAt: latestAssessment?.completedAt ?? null,
        lastMatchingAt: latestMatchingSession?.completedAt ?? null,
        suggestedNextAction: nextSteps.suggestedNextAction,
        linkedContent,
        nextSteps: nextSteps.nextSteps,
      }),
    };
  }
}

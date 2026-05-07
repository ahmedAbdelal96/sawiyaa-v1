import { Injectable } from '@nestjs/common';
import {
  AssessmentResultBand,
  InstantBookingRequestStatus,
  PaymentStatus,
  SessionMode,
  SessionStatus,
  SupportTicketStatus,
  SupportTicketType,
} from '@prisma/client';
import {
  PatientJourneyNextStepViewModel,
  PatientJourneyViewModel,
} from '../types/patient-journey.types';

@Injectable()
export class PatientJourneyMapper {
  toViewModel(input: {
    upcomingSession: {
      id: string;
      status: SessionStatus;
      scheduledStartAt: Date | null;
      scheduledEndAt: Date | null;
      practitioner: {
        publicSlug: string;
        user: {
          displayName: string | null;
        };
      };
    } | null;
    pendingPayment: {
      id: string;
      status: PaymentStatus;
      amountTotal: { toString(): string };
      currencyCode: string;
      sessionId: string | null;
      createdAt: Date;
      expiredAt: Date | null;
    } | null;
    pendingInstantBookingRequest: {
      id: string;
      status: InstantBookingRequestStatus;
      requestedAt: Date;
      expiresAt: Date;
      requestedDurationMinutes: number;
      preferredMode: SessionMode;
      practitioner: {
        publicSlug: string;
        user: {
          displayName: string | null;
        };
      };
    } | null;
    recentPastSessions: Array<{
      id: string;
      status: SessionStatus;
      scheduledStartAt: Date | null;
      scheduledEndAt: Date | null;
      practitioner: {
        publicSlug: string;
        user: {
          displayName: string | null;
        };
      };
    }>;
    recentAssessments: Array<{
      id: string;
      completedAt: Date | null;
      totalScore: number | null;
      resultBand: AssessmentResultBand | null;
      definitionSlugSnapshot: string;
      definitionTitleSnapshot: string;
    }>;
    recentMatching: Array<{
      id: string;
      completedAt: Date | null;
      recommendations: Array<{
        score: number;
        practitionerProfile: {
          publicSlug: string;
          user: {
            displayName: string | null;
          };
        };
      }>;
    }>;
    recentPayments: Array<{
      id: string;
      status: PaymentStatus;
      amountTotal: { toString(): string };
      currencyCode: string;
      createdAt: Date;
      sessionId: string | null;
    }>;
    latestOpenSupportTicket: {
      id: string;
      ticketType: SupportTicketType;
      status: SupportTicketStatus;
      updatedAt: Date;
    } | null;
    lastAssessmentTakenAt: Date | null;
    lastMatchingAt: Date | null;
    suggestedNextAction: PatientJourneyViewModel['summary']['suggestedNextAction'];
    linkedContent: PatientJourneyViewModel['linkedContent'];
    nextSteps: PatientJourneyNextStepViewModel[];
  }): PatientJourneyViewModel {
    return {
      summary: {
        hasUpcomingSession: Boolean(input.upcomingSession),
        nextSessionAt:
          input.upcomingSession?.scheduledStartAt?.toISOString() ?? null,
        hasPendingPayment: Boolean(input.pendingPayment),
        hasOpenSupportTicket: Boolean(input.latestOpenSupportTicket),
        lastAssessmentTakenAt:
          input.lastAssessmentTakenAt?.toISOString() ?? null,
        lastMatchingAt: input.lastMatchingAt?.toISOString() ?? null,
        suggestedNextAction: input.suggestedNextAction,
      },
      upcoming: {
        session: input.upcomingSession
          ? {
              id: input.upcomingSession.id,
              status: input.upcomingSession.status,
              scheduledStartAt:
                input.upcomingSession.scheduledStartAt?.toISOString() ?? null,
              scheduledEndAt:
                input.upcomingSession.scheduledEndAt?.toISOString() ?? null,
              practitioner: {
                slug: input.upcomingSession.practitioner.publicSlug,
                displayName:
                  input.upcomingSession.practitioner.user.displayName ?? null,
              },
            }
          : null,
        pendingPayment: input.pendingPayment
          ? {
              id: input.pendingPayment.id,
              status: input.pendingPayment.status,
              amount: input.pendingPayment.amountTotal.toString(),
              currency: input.pendingPayment.currencyCode,
              sessionId: input.pendingPayment.sessionId ?? null,
              createdAt: input.pendingPayment.createdAt.toISOString(),
              expiredAt: input.pendingPayment.expiredAt?.toISOString() ?? null,
            }
          : null,
        instantBookingRequest: input.pendingInstantBookingRequest
          ? {
              id: input.pendingInstantBookingRequest.id,
              status: input.pendingInstantBookingRequest.status,
              requestedAt:
                input.pendingInstantBookingRequest.requestedAt.toISOString(),
              expiresAt:
                input.pendingInstantBookingRequest.expiresAt.toISOString(),
              durationMinutes:
                input.pendingInstantBookingRequest.requestedDurationMinutes,
              sessionMode: input.pendingInstantBookingRequest.preferredMode,
              practitioner: {
                slug: input.pendingInstantBookingRequest.practitioner
                  .publicSlug,
                displayName:
                  input.pendingInstantBookingRequest.practitioner.user
                    .displayName ?? null,
              },
            }
          : null,
      },
      recentHistory: {
        sessions: input.recentPastSessions.map((session) => ({
          id: session.id,
          status: session.status,
          scheduledStartAt: session.scheduledStartAt?.toISOString() ?? null,
          scheduledEndAt: session.scheduledEndAt?.toISOString() ?? null,
          practitioner: {
            slug: session.practitioner.publicSlug,
            displayName: session.practitioner.user.displayName ?? null,
          },
        })),
        assessments: input.recentAssessments.map((assessment) => ({
          id: assessment.id,
          assessmentSlug: assessment.definitionSlugSnapshot,
          assessmentTitle: assessment.definitionTitleSnapshot,
          completedAt: assessment.completedAt?.toISOString() ?? null,
          band: assessment.resultBand,
          score: assessment.totalScore,
        })),
        matching: input.recentMatching.map((matching) => {
          const recommendation = matching.recommendations[0];
          return {
            id: matching.id,
            completedAt: matching.completedAt?.toISOString() ?? null,
            topRecommendation: recommendation
              ? {
                  practitionerSlug:
                    recommendation.practitionerProfile.publicSlug,
                  practitionerDisplayName:
                    recommendation.practitionerProfile.user.displayName ?? null,
                  score: recommendation.score,
                }
              : null,
          };
        }),
        payments: input.recentPayments.map((payment) => ({
          id: payment.id,
          status: payment.status,
          amount: payment.amountTotal.toString(),
          currency: payment.currencyCode,
          createdAt: payment.createdAt.toISOString(),
          sessionId: payment.sessionId ?? null,
        })),
      },
      support: {
        hasOpenTicket: Boolean(input.latestOpenSupportTicket),
        latestOpenTicket: input.latestOpenSupportTicket
          ? {
              id: input.latestOpenSupportTicket.id,
              category: input.latestOpenSupportTicket.ticketType,
              status: input.latestOpenSupportTicket.status,
              updatedAt: input.latestOpenSupportTicket.updatedAt.toISOString(),
            }
          : null,
      },
      linkedContent: input.linkedContent,
      nextSteps: input.nextSteps,
    };
  }
}

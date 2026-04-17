import { Injectable } from '@nestjs/common';
import {
  AssessmentSubmissionStatus,
  InstantBookingRequestStatus,
  PaymentStatus,
  SessionStatus,
  SupportTicketStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class PatientJourneyReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUpcomingSession(patientId: string, nowUtc: Date) {
    return this.prisma.session.findFirst({
      where: {
        patientId,
        scheduledStartAt: {
          gte: nowUtc,
        },
        status: {
          in: [
            SessionStatus.PENDING_PAYMENT,
            SessionStatus.PENDING_PRACTITIONER_RESPONSE,
            SessionStatus.CONFIRMED,
            SessionStatus.UPCOMING,
            SessionStatus.READY_TO_JOIN,
          ],
        },
      },
      orderBy: {
        scheduledStartAt: 'asc',
      },
      select: {
        id: true,
        status: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        practitioner: {
          select: {
            publicSlug: true,
            user: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });
  }

  listRecentPastSessions(patientId: string, nowUtc: Date, take: number) {
    return this.prisma.session.findMany({
      where: {
        patientId,
        scheduledStartAt: {
          lt: nowUtc,
        },
        status: {
          in: [
            SessionStatus.COMPLETED,
            SessionStatus.NO_SHOW,
            SessionStatus.CANCELLED,
            SessionStatus.EXPIRED,
          ],
        },
      },
      orderBy: {
        scheduledStartAt: 'desc',
      },
      take,
      select: {
        id: true,
        status: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        practitioner: {
          select: {
            publicSlug: true,
            user: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });
  }

  findPendingPayment(patientId: string, upcomingSessionId?: string) {
    return this.prisma.payment.findFirst({
      where: {
        patientId,
        status: {
          in: [
            PaymentStatus.CREATED,
            PaymentStatus.PENDING,
            PaymentStatus.REQUIRES_ACTION,
            PaymentStatus.AUTHORIZED,
          ],
        },
        ...(upcomingSessionId ? { sessionId: upcomingSessionId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        status: true,
        amountTotal: true,
        currencyCode: true,
        sessionId: true,
        createdAt: true,
      },
    });
  }

  listRecentPayments(patientId: string, take: number) {
    return this.prisma.payment.findMany({
      where: {
        patientId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take,
      select: {
        id: true,
        status: true,
        amountTotal: true,
        currencyCode: true,
        createdAt: true,
        sessionId: true,
      },
    });
  }

  findPendingInstantBookingRequest(patientId: string, nowUtc: Date) {
    return this.prisma.instantBookingRequest.findFirst({
      where: {
        patientId,
        status: InstantBookingRequestStatus.PENDING,
        expiresAt: {
          gt: nowUtc,
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        expiresAt: true,
        requestedDurationMinutes: true,
        preferredMode: true,
        practitioner: {
          select: {
            publicSlug: true,
            user: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });
  }

  findLatestAssessment(patientId: string) {
    return this.prisma.assessmentSubmission.findFirst({
      where: {
        patientProfileId: patientId,
        status: AssessmentSubmissionStatus.COMPLETED,
      },
      orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        completedAt: true,
        totalScore: true,
        resultBand: true,
        definitionSlugSnapshot: true,
        definitionTitleSnapshot: true,
      },
    });
  }

  listRecentAssessments(patientId: string, take: number) {
    return this.prisma.assessmentSubmission.findMany({
      where: {
        patientProfileId: patientId,
        status: AssessmentSubmissionStatus.COMPLETED,
      },
      orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
      take,
      select: {
        id: true,
        completedAt: true,
        totalScore: true,
        resultBand: true,
        definitionSlugSnapshot: true,
        definitionTitleSnapshot: true,
      },
    });
  }

  findLatestMatchingSession(patientId: string) {
    return this.prisma.matchingSession.findFirst({
      where: {
        patientProfileId: patientId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        completedAt: true,
        recommendations: {
          orderBy: {
            rank: 'asc',
          },
          take: 1,
          select: {
            score: true,
            practitionerProfile: {
              select: {
                publicSlug: true,
                user: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  listRecentMatchingSessions(patientId: string, take: number) {
    return this.prisma.matchingSession.findMany({
      where: {
        patientProfileId: patientId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take,
      select: {
        id: true,
        completedAt: true,
        recommendations: {
          orderBy: {
            rank: 'asc',
          },
          take: 1,
          select: {
            score: true,
            practitionerProfile: {
              select: {
                publicSlug: true,
                user: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  findLatestOpenSupportTicket(patientId: string) {
    return this.prisma.supportTicket.findFirst({
      where: {
        patientId,
        status: {
          in: [
            SupportTicketStatus.OPEN,
            SupportTicketStatus.IN_PROGRESS,
            SupportTicketStatus.WAITING_FOR_USER,
            SupportTicketStatus.ESCALATED,
          ],
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        ticketType: true,
        status: true,
        updatedAt: true,
      },
    });
  }
}

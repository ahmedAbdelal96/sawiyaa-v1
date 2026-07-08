import { Injectable } from '@nestjs/common';
import {
  AssessmentSubmissionStatus,
  EnrollmentStatus,
  PaymentStatus,
  SessionStatus,
  SupportTicketStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { RawCareSignalSnapshot } from '../types/care-signal-context.types';

@Injectable()
export class CareSignalContextRepository {
  constructor(private readonly prisma: PrismaService) {}

  async readSnapshot(input: {
    patientProfileId: string;
    userId: string;
    now: Date;
  }): Promise<RawCareSignalSnapshot> {
    const [
      patient,
      latestAssessment,
      upcomingSession,
      pastSession,
      pendingPayment,
      recentMatchingSession,
      latestOpenSupportTicket,
      activeAcademyEnrollment,
    ] = await Promise.all([
      this.prisma.patientProfile.findUnique({
        where: { id: input.patientProfileId },
        select: {
          id: true,
          userId: true,
          country: {
            select: {
              isoCode: true,
            },
          },
          user: {
            select: {
              timezone: true,
            },
          },
        },
      }),
      this.prisma.assessmentSubmission.findFirst({
        where: {
          patientProfileId: input.patientProfileId,
          status: AssessmentSubmissionStatus.COMPLETED,
        },
        orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          completedAt: true,
          resultBand: true,
        },
      }),
      this.prisma.session.findFirst({
        where: {
          patientId: input.patientProfileId,
          scheduledStartAt: {
            gte: input.now,
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
        orderBy: { scheduledStartAt: 'asc' },
        select: {
          status: true,
        },
      }),
      this.prisma.session.findFirst({
        where: {
          patientId: input.patientProfileId,
          scheduledStartAt: { lt: input.now },
          status: {
            in: [
              SessionStatus.COMPLETED,
              SessionStatus.NO_SHOW,
              SessionStatus.CANCELLED,
              SessionStatus.EXPIRED,
            ],
          },
        },
        select: { id: true },
      }),
      this.prisma.payment.findFirst({
        where: {
          patientId: input.patientProfileId,
          status: {
            in: [
              PaymentStatus.CREATED,
              PaymentStatus.PENDING,
              PaymentStatus.REQUIRES_ACTION,
              PaymentStatus.AUTHORIZED,
            ],
          },
          OR: [
            { expiredAt: null },
            {
              expiredAt: {
                gt: input.now,
              },
            },
          ],
        },
        orderBy: [{ createdAt: 'desc' }],
        select: {
          status: true,
        },
      }),
      this.prisma.matchingSession.findFirst({
        where: {
          patientProfileId: input.patientProfileId,
        },
        select: {
          id: true,
        },
      }),
      this.prisma.supportTicket.findFirst({
        where: {
          patientId: input.patientProfileId,
          status: {
            in: [
              SupportTicketStatus.OPEN,
              SupportTicketStatus.IN_PROGRESS,
              SupportTicketStatus.WAITING_FOR_USER,
              SupportTicketStatus.ESCALATED,
            ],
          },
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          status: true,
        },
      }),
      this.prisma.enrollment.findFirst({
        where: {
          userId: input.userId,
          enrollmentStatus: EnrollmentStatus.ACTIVE,
        },
        select: {
          id: true,
        },
      }),
    ]);

    return {
      patientProfileId: input.patientProfileId,
      userId: input.userId,
      patientCountryIsoCode: patient?.country?.isoCode ?? null,
      userTimezone: patient?.user?.timezone ?? null,
      latestAssessmentCompletedAt: latestAssessment?.completedAt ?? null,
      latestAssessmentBand: latestAssessment?.resultBand ?? null,
      upcomingSessionStatus: upcomingSession?.status ?? null,
      hasPastSession: Boolean(pastSession),
      pendingPaymentStatus: pendingPayment?.status ?? null,
      hasRecentMatchingSession: Boolean(recentMatchingSession),
      hasOpenSupportTicket: Boolean(latestOpenSupportTicket),
      latestSupportTicketStatus: latestOpenSupportTicket?.status ?? null,
      hasActiveAcademyEnrollment: Boolean(activeAcademyEnrollment),
    };
  }
}

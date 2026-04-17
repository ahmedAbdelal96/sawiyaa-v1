import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

@Injectable()
export class SupportRelatedEntityRepository {
  constructor(private readonly prisma: PrismaService) {}

  patientOwnsSession(sessionId: string, patientProfileId: string) {
    return this.prisma.session.count({
      where: {
        id: sessionId,
        patientId: patientProfileId,
      },
    });
  }

  practitionerOwnsSession(sessionId: string, practitionerProfileId: string) {
    return this.prisma.session.count({
      where: {
        id: sessionId,
        practitionerId: practitionerProfileId,
      },
    });
  }

  patientOwnsPayment(paymentId: string, patientProfileId: string) {
    return this.prisma.payment.count({
      where: {
        id: paymentId,
        patientId: patientProfileId,
      },
    });
  }

  practitionerOwnsPayment(paymentId: string, practitionerProfileId: string) {
    return this.prisma.payment.count({
      where: {
        id: paymentId,
        practitionerId: practitionerProfileId,
      },
    });
  }

  patientOwnsInstantBookingRequest(
    instantBookingRequestId: string,
    patientProfileId: string,
  ) {
    return this.prisma.instantBookingRequest.count({
      where: {
        id: instantBookingRequestId,
        patientId: patientProfileId,
      },
    });
  }

  practitionerOwnsInstantBookingRequest(
    instantBookingRequestId: string,
    practitionerProfileId: string,
  ) {
    return this.prisma.instantBookingRequest.count({
      where: {
        id: instantBookingRequestId,
        practitionerId: practitionerProfileId,
      },
    });
  }

  patientOwnsMatchingSession(matchingSessionId: string, patientProfileId: string) {
    return this.prisma.matchingSession.count({
      where: {
        id: matchingSessionId,
        patientProfileId,
      },
    });
  }

  patientOwnsAssessmentSubmission(
    assessmentSubmissionId: string,
    patientProfileId: string,
  ) {
    return this.prisma.assessmentSubmission.count({
      where: {
        id: assessmentSubmissionId,
        patientProfileId,
      },
    });
  }
}

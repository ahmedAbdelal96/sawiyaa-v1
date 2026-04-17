import { Injectable } from '@nestjs/common';
import {
  InstantBookingRequestStatus,
  Prisma,
  SessionMode,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class InstantBookingRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createRequest(
    data: {
      patientId: string;
      practitionerId: string;
      requestedDurationMinutes: number;
      preferredMode: SessionMode;
      expiresAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).instantBookingRequest.create({
      data,
      include: this.requestInclude,
    });
  }

  findById(requestId: string) {
    return this.prisma.instantBookingRequest.findUnique({
      where: { id: requestId },
      include: this.requestInclude,
    });
  }

  listPatientRequests(patientId: string) {
    return this.prisma.instantBookingRequest.findMany({
      where: { patientId },
      include: this.requestInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  listPendingPractitionerRequests(practitionerId: string, now: Date) {
    return this.prisma.instantBookingRequest.findMany({
      where: {
        practitionerId,
        status: InstantBookingRequestStatus.PENDING,
        expiresAt: {
          gt: now,
        },
      },
      include: this.requestInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findConflictingPendingRequests(input: {
    patientId?: string;
    practitionerId?: string;
    now: Date;
  }) {
    return this.prisma.instantBookingRequest.findMany({
      where: {
        status: InstantBookingRequestStatus.PENDING,
        expiresAt: {
          gt: input.now,
        },
        ...(input.patientId ? { patientId: input.patientId } : {}),
        ...(input.practitionerId
          ? { practitionerId: input.practitionerId }
          : {}),
      },
      include: this.requestInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  updateRequest(
    requestId: string,
    data: Prisma.InstantBookingRequestUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).instantBookingRequest.update({
      where: { id: requestId },
      data,
      include: this.requestInclude,
    });
  }

  markExpired(
    now: Date,
    input?: { requestId?: string; patientId?: string; practitionerId?: string },
  ) {
    return this.prisma.instantBookingRequest.updateMany({
      where: {
        status: InstantBookingRequestStatus.PENDING,
        expiresAt: {
          lte: now,
        },
        ...(input?.requestId ? { id: input.requestId } : {}),
        ...(input?.patientId ? { patientId: input.patientId } : {}),
        ...(input?.practitionerId
          ? { practitionerId: input.practitionerId }
          : {}),
      },
      data: {
        status: InstantBookingRequestStatus.EXPIRED,
        respondedAt: now,
        responseReason: 'expired',
      },
    });
  }

  private readonly requestInclude = {
    practitioner: {
      select: {
        id: true,
        publicSlug: true,
        user: {
          select: {
            displayName: true,
          },
        },
      },
    },
    patient: {
      select: {
        id: true,
        user: {
          select: {
            displayName: true,
          },
        },
      },
    },
  } satisfies Prisma.InstantBookingRequestInclude;
}

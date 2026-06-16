import { Injectable } from '@nestjs/common';
import {
  AvailabilityExceptionSource,
  AvailabilityExceptionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * AvailabilityExceptionRepository owns temporary availability overrides.
 * Deletes are modeled as soft-deactivation so future audit/history can be preserved without changing API semantics.
 */
@Injectable()
export class AvailabilityExceptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  listUpcomingActiveByPractitioner(
    practitionerId: string,
    fromUtc: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).availabilityException.findMany({
      where: {
        practitionerId,
        isActive: true,
        endsAtUtc: {
          gte: fromUtc,
        },
      },
      orderBy: [{ startsAtUtc: 'asc' }, { endsAtUtc: 'asc' }],
    });
  }

  listActiveForPractitionersBetween(
    practitionerIds: string[],
    fromUtc: Date,
    toUtc: Date,
    tx?: Prisma.TransactionClient,
  ) {
    if (practitionerIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.getDb(tx).availabilityException.findMany({
      where: {
        practitionerId: {
          in: practitionerIds,
        },
        isActive: true,
        startsAtUtc: {
          lt: toUtc,
        },
        endsAtUtc: {
          gt: fromUtc,
        },
      },
      orderBy: [
        { practitionerId: 'asc' },
        { startsAtUtc: 'asc' },
        { endsAtUtc: 'asc' },
      ],
    });
  }

  listActiveForRange(
    practitionerId: string,
    fromUtc: Date,
    toUtc: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).availabilityException.findMany({
      where: {
        practitionerId,
        isActive: true,
        startsAtUtc: {
          lt: toUtc,
        },
        endsAtUtc: {
          gt: fromUtc,
        },
      },
      orderBy: [{ startsAtUtc: 'asc' }, { endsAtUtc: 'asc' }],
    });
  }

  findActiveByIdForPractitioner(
    practitionerId: string,
    exceptionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).availabilityException.findFirst({
      where: {
        id: exceptionId,
        practitionerId,
        isActive: true,
      },
    });
  }

  createException(
    practitionerId: string,
    data: {
      type: AvailabilityExceptionType;
      startsAtUtc: Date;
      endsAtUtc: Date;
      reason?: string | null;
      source?: AvailabilityExceptionSource;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).availabilityException.create({
      data: {
        practitionerId,
        type: data.type,
        startsAtUtc: data.startsAtUtc,
        endsAtUtc: data.endsAtUtc,
        reason: data.reason ?? null,
        source: data.source ?? AvailabilityExceptionSource.MANUAL,
        isActive: true,
      },
    });
  }

  updateException(
    practitionerId: string,
    exceptionId: string,
    data: Prisma.AvailabilityExceptionUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).availabilityException.updateMany({
      where: {
        id: exceptionId,
        practitionerId,
        isActive: true,
      },
      data,
    });
  }
}

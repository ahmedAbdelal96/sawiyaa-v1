import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RefundDestination,
  SessionCancellationBookingType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SessionCancellationPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  listPolicies() {
    return this.prisma.sessionCancellationPolicy.findMany({
      include: {
        rules: {
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ bookingType: 'asc' }],
    });
  }

  findPolicyByBookingType(
    bookingType: SessionCancellationBookingType,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionCancellationPolicy.findUnique({
      where: { bookingType },
      include: {
        rules: {
          where: { isActive: true },
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  updatePolicy(input: {
    bookingType: SessionCancellationBookingType;
    displayName: string;
    isActive: boolean;
    defaultRefundDestination: RefundDestination;
    rules: Prisma.SessionCancellationPolicyRuleCreateWithoutPolicyInput[];
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).sessionCancellationPolicy.update({
      where: { bookingType: input.bookingType },
      data: {
        displayName: input.displayName,
        isActive: input.isActive,
        defaultRefundDestination: input.defaultRefundDestination,
        version: {
          increment: 1,
        },
        rules: {
          deleteMany: {},
          create: input.rules,
        },
      },
      include: {
        rules: {
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  createCancellationRecord(
    data: Prisma.SessionCancellationRecordUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).sessionCancellationRecord.create({ data });
  }
}

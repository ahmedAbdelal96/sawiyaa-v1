import { Injectable } from '@nestjs/common';
import {
  CustomerWalletEntryType,
  Prisma,
  type CustomerWalletEntry,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CustomerWalletEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createEntry(
    data: Prisma.CustomerWalletEntryUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).customerWalletEntry.create({
      data,
    });
  }

  findRefundCreditEntry(refundId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).customerWalletEntry.findFirst({
      where: {
        refundId,
        entryType: CustomerWalletEntryType.REFUND_CREDIT,
      },
    });
  }

  listByPatientId(input: {
    patientId: string;
    currencyCode?: string;
    page: number;
    limit: number;
  }): Promise<[CustomerWalletEntry[], number]> {
    const where: Prisma.CustomerWalletEntryWhereInput = {
      patientId: input.patientId,
      ...(input.currencyCode ? { currencyCode: input.currencyCode } : {}),
    };
    const skip = (input.page - 1) * input.limit;

    return Promise.all([
      this.prisma.customerWalletEntry.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ effectiveAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.customerWalletEntry.count({ where }),
    ]);
  }
}

import { Prisma, SecurityAuditLog } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/** Append-only persistence boundary for security audit records. */
export class SecurityAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  create(
    data: Prisma.SecurityAuditLogUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<SecurityAuditLog> {
    return this.getDb(tx).securityAuditLog.create({ data });
  }
}

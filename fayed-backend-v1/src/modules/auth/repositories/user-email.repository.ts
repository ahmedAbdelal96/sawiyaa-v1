import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Email identity lookups are isolated because they are used by patient, practitioner, admin, and recovery flows.
 */
@Injectable()
export class UserEmailRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findByEmail(email: string) {
    return this.prisma.userEmail.findUnique({
      where: { email },
      include: {
        user: {
          include: {
            roles: true,
            practitionerProfile: true,
            emails: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
            phones: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });
  }

  findByEmailForAuth(email: string) {
    return this.prisma.userEmail.findUnique({
      where: { email },
      include: {
        user: {
          include: {
            roles: true,
            emails: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
            phones: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });
  }

  findByEmailForPractitionerAuth(email: string) {
    return this.prisma.userEmail.findUnique({
      where: { email },
      include: {
        user: {
          include: {
            roles: true,
            practitionerProfile: {
              select: {
                id: true,
                status: true,
              },
            },
            emails: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
            phones: {
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });
  }

  upsertPrimaryEmail(
    userId: string,
    email: string,
    isVerified: boolean,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).userEmail.upsert({
      where: { email },
      create: {
        userId,
        email,
        isPrimary: true,
        isVerified,
      },
      update: {
        userId,
        isPrimary: true,
        isVerified,
      },
    });
  }

  upsertSecondaryEmail(
    userId: string,
    email: string,
    isVerified: boolean,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).userEmail.upsert({
      where: { email },
      create: {
        userId,
        email,
        isPrimary: false,
        isVerified,
      },
      update: {
        userId,
        isPrimary: false,
        isVerified,
      },
    });
  }

  findPrimaryEmailForUser(userId: string) {
    return this.prisma.userEmail.findFirst({
      where: { userId, isPrimary: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}

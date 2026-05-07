import { Injectable } from '@nestjs/common';
import {
  PractitionerStatus,
  Prisma,
  PrismaClient,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { buildDraftPractitionerSlug } from '../utils/slug.util';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * UserRepository centralizes auth-related writes for user, role, and minimal profile bootstrap.
 * It keeps auth use cases away from raw Prisma model orchestration.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  createUser(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).user.create({ data });
  }

  findByIdWithAuthContext(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        status: true,
        tokenVersion: true,
        roles: true,
        emails: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          select: {
            email: true,
            isPrimary: true,
            isVerified: true,
          },
        },
        phones: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          select: {
            phone: true,
            isPrimary: true,
            isVerified: true,
          },
        },
        practitionerProfile: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  ensureRole(
    userId: string,
    role: UserRoleType,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).userRole.upsert({
      where: {
        userId_role: {
          userId,
          role,
        },
      },
      create: {
        userId,
        role,
      },
      update: {},
    });
  }

  createPatientProfileIfMissing(
    userId: string,
    displayName?: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).patientProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: displayName ?? null,
      },
      update: {},
    });
  }

  createPractitionerProfileIfMissing(
    userId: string,
    slugSeed: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerProfile.upsert({
      where: { userId },
      create: {
        userId,
        publicSlug: buildDraftPractitionerSlug(slugSeed),
        status: PractitionerStatus.DRAFT,
      },
      update: {},
    });
  }

  updateStatus(
    userId: string,
    status: UserStatus,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).user.update({
      where: { id: userId },
      data: { status },
    });
  }

  incrementTokenVersion(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).user.update({
      where: { id: userId },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });
  }
}

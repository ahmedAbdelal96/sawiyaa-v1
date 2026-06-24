import { Injectable } from '@nestjs/common';
import { AuthProvider, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Auth identities cover password and Google providers for Phase 1.
 */
@Injectable()
export class AuthIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findByProviderSubject(provider: AuthProvider, providerSubject: string) {
    return this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider,
          providerSubject,
        },
      },
      include: {
        user: {
          include: {
            roles: true,
            practitionerProfile: true,
          },
        },
      },
    });
  }

  findPasswordIdentityByUserId(userId: string) {
    return this.prisma.authIdentity.findFirst({
      where: {
        userId,
        provider: AuthProvider.PASSWORD,
        isEnabled: true,
      },
    });
  }

  createPasswordIdentity(
    userId: string,
    passwordHash: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).authIdentity.create({
      data: {
        userId,
        provider: AuthProvider.PASSWORD,
        passwordHash,
        isEnabled: true,
      },
    });
  }

  upsertGoogleIdentity(
    userId: string,
    providerSubject: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).authIdentity.upsert({
      where: {
        provider_providerSubject: {
          provider: AuthProvider.GOOGLE,
          providerSubject,
        },
      },
      create: {
        userId,
        provider: AuthProvider.GOOGLE,
        providerSubject,
        isEnabled: true,
      },
      update: {
        userId,
        isEnabled: true,
        lastUsedAt: new Date(),
      },
    });
  }

  updatePasswordHash(
    userId: string,
    passwordHash: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).authIdentity.updateMany({
      where: {
        userId,
        provider: AuthProvider.PASSWORD,
      },
      data: {
        passwordHash,
        isEnabled: true,
        lastUsedAt: new Date(),
      },
    });
  }

  touchLastUsed(identityId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).authIdentity.update({
      where: { id: identityId },
      data: { lastUsedAt: new Date() },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { CredentialReviewStatus, CredentialType, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Admin credential repository exposes metadata needed for review decisions.
 * It keeps file-storage concerns out of this admin decision scope.
 */
@Injectable()
export class AdminPractitionerCredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  listByPractitionerId(practitionerId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerCredential.findMany({
      where: { practitionerId },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        credentialType: true,
        fileUrl: true,
        storedFileId: true,
        reviewStatus: true,
        reviewedAt: true,
        reviewedByUserId: true,
        reviewNotes: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  findById(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerCredential.findUnique({
      where: { id },
      select: {
        id: true,
        applicationId: true,
        practitionerId: true,
        credentialType: true,
        fileUrl: true,
        storedFileId: true,
        reviewStatus: true,
        reviewedAt: true,
        reviewedByUserId: true,
        reviewNotes: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  create(
    data: {
      practitionerId?: string | null;
      applicationId?: string | null;
      credentialType: CredentialType;
      fileUrl: string;
      storedFileId?: string | null;
      reviewStatus?: CredentialReviewStatus;
      reviewedAt?: Date | null;
      reviewedByUserId?: string | null;
      reviewNotes?: string | null;
      expiresAt?: Date | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerCredential.create({
      data: {
        practitionerId: data.practitionerId ?? null,
        applicationId: data.applicationId ?? null,
        credentialType: data.credentialType,
        fileUrl: data.fileUrl,
        storedFileId: data.storedFileId ?? this.extractStoredFileId(data.fileUrl),
        reviewStatus: data.reviewStatus,
        reviewedAt: data.reviewedAt ?? null,
        reviewedByUserId: data.reviewedByUserId ?? null,
        reviewNotes: data.reviewNotes ?? null,
        expiresAt: data.expiresAt ?? null,
      },
      select: {
        id: true,
        credentialType: true,
        fileUrl: true,
        storedFileId: true,
        reviewStatus: true,
        reviewedAt: true,
        reviewedByUserId: true,
        reviewNotes: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  update(
    id: string,
    data: {
      credentialType?: CredentialType;
      fileUrl?: string;
      storedFileId?: string | null;
      reviewStatus?: CredentialReviewStatus;
      reviewedAt?: Date | null;
      reviewedByUserId?: string | null;
      reviewNotes?: string | null;
      expiresAt?: Date | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerCredential.update({
      where: { id },
      data: {
        credentialType: data.credentialType,
        fileUrl: data.fileUrl,
        storedFileId: data.storedFileId,
        reviewStatus: data.reviewStatus,
        reviewedAt: data.reviewedAt,
        reviewedByUserId: data.reviewedByUserId,
        reviewNotes: data.reviewNotes,
        expiresAt: data.expiresAt,
      },
      select: {
        id: true,
        credentialType: true,
        fileUrl: true,
        storedFileId: true,
        reviewStatus: true,
        reviewedAt: true,
        reviewedByUserId: true,
        reviewNotes: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  delete(id: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerCredential.delete({
      where: { id },
      select: {
        id: true,
      },
    });
  }

  private extractStoredFileId(fileUrl: string): string | null {
    const name = fileUrl.split('?')[0].split('/').pop() ?? '';
    const candidate = name.slice(0, name.lastIndexOf('.'));
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : null;
  }
}

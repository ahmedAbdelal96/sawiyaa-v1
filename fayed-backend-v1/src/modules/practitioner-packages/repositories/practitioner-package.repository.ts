import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PractitionerPackageStatus,
  PractitionerStatus,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';

type DbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PractitionerPackageRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getDb(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  findPractitionerProfileByUserId(userId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        acceptsPackages: true,
      },
    });
  }

  findByIdAndPractitionerId(
    packageId: string,
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerPackage.findFirst({
      where: {
        id: packageId,
        practitionerId,
      },
      include: this.includePackageCounts(),
    });
  }

  findById(packageId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerPackage.findUnique({
      where: { id: packageId },
      include: this.includePackageCounts(),
    });
  }

  findAdminById(packageId: string, tx?: Prisma.TransactionClient) {
    return this.getDb(tx).practitionerPackage.findUnique({
      where: { id: packageId },
      include: this.includeAdminPackageInclude(),
    });
  }

  findPublicByPractitionerSlugAndPackageSlug(input: {
    practitionerSlug: string;
    packageSlug: string;
    tx?: Prisma.TransactionClient;
  }) {
    return this.getDb(input.tx).practitionerPackage.findFirst({
      where: {
        slug: input.packageSlug.trim().toLowerCase(),
        status: PractitionerPackageStatus.ACTIVE,
        archivedAt: null,
        practitioner: {
          publicSlug: input.practitionerSlug.trim().toLowerCase(),
          acceptsPackages: true,
          status: PractitionerStatus.APPROVED,
          user: {
            status: UserStatus.ACTIVE,
          },
          isPublicProfilePublished: true,
        },
      },
      include: this.includePublicPackageInclude(),
    });
  }

  listPublicActiveByPractitionerId(
    input: {
      practitionerId: string;
      page: number;
      limit: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const skip = (input.page - 1) * input.limit;
    const db = this.getDb(tx);
    const where: Prisma.PractitionerPackageWhereInput = {
      practitionerId: input.practitionerId,
      status: PractitionerPackageStatus.ACTIVE,
      archivedAt: null,
    };

    return Promise.all([
      db.practitionerPackage.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        include: this.includePackageCounts(),
      }),
      db.practitionerPackage.count({ where }),
    ]);
  }

  listAdminPackages(input: {
    page: number;
    limit: number;
    q?: string;
    practitionerId?: string;
    status?: PractitionerPackageStatus;
    tx?: Prisma.TransactionClient;
  }) {
    const skip = (input.page - 1) * input.limit;
    const db = this.getDb(input.tx);
    const where: Prisma.PractitionerPackageWhereInput = {
      ...(input.practitionerId
        ? { practitionerId: input.practitionerId }
        : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.q
        ? {
            OR: [
              { title: { contains: input.q, mode: 'insensitive' } },
              { slug: { contains: input.q, mode: 'insensitive' } },
              {
                practitioner: {
                  user: {
                    displayName: {
                      contains: input.q,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      db.practitionerPackage.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        include: this.includeAdminPackageInclude(),
      }),
      db.practitionerPackage.count({ where }),
    ]);
  }

  findByPractitionerIdAndSlug(
    practitionerId: string,
    slug: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerPackage.findFirst({
      where: {
        practitionerId,
        slug,
      },
      select: {
        id: true,
      },
    });
  }

  countAllByPractitionerId(
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerPackage.count({
      where: { practitionerId },
    });
  }

  countNonArchivedByPractitionerId(
    practitionerId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerPackage.count({
      where: {
        practitionerId,
        archivedAt: null,
      },
    });
  }

  listByPractitionerId(input: {
    practitionerId: string;
    page: number;
    limit: number;
    tx?: Prisma.TransactionClient;
  }) {
    const skip = (input.page - 1) * input.limit;
    const db = this.getDb(input.tx);
    const where: Prisma.PractitionerPackageWhereInput = {
      practitionerId: input.practitionerId,
    };

    return Promise.all([
      db.practitionerPackage.findMany({
        where,
        skip,
        take: input.limit,
        orderBy: [{ updatedAt: 'desc' }],
        include: this.includePackageCounts(),
      }),
      db.practitionerPackage.count({ where }),
      db.practitionerPackage.count({
        where: {
          practitionerId: input.practitionerId,
          archivedAt: null,
        },
      }),
    ]);
  }

  createDraft(
    data: Prisma.PractitionerPackageUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerPackage.create({
      data,
      include: this.includePackageCounts(),
    });
  }

  updateById(
    packageId: string,
    data: Prisma.PractitionerPackageUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getDb(tx).practitionerPackage.update({
      where: { id: packageId },
      data,
      include: this.includeAdminPackageInclude(),
    });
  }

  disableById(
    packageId: string,
    data: Prisma.PractitionerPackageUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.updateById(packageId, data, tx);
  }

  enableById(
    packageId: string,
    data: Prisma.PractitionerPackageUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.updateById(packageId, data, tx);
  }

  private includePackageCounts() {
    return {
      _count: {
        select: {
          purchases: true,
          sessions: true,
        },
      },
    } as const;
  }

  private includeAdminPackageInclude() {
    return {
      practitioner: {
        select: {
          id: true,
          publicSlug: true,
          status: true,
          acceptsPackages: true,
          user: {
            select: {
              displayName: true,
              status: true,
            },
          },
        },
      },
      _count: {
        select: {
          purchases: true,
          sessions: true,
        },
      },
    } as const;
  }

  private includePublicPackageInclude() {
    return {
      practitioner: {
        select: {
          id: true,
          publicSlug: true,
          status: true,
          acceptsPackages: true,
          user: {
            select: {
              displayName: true,
              status: true,
            },
          },
        },
      },
      _count: {
        select: {
          purchases: true,
          sessions: true,
        },
      },
    } as const;
  }
}

import {
  PractitionerPackageStatus,
  UserStatus,
  PractitionerStatus,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { PractitionerPackageRepository } from './practitioner-package.repository';

describe('PractitionerPackageRepository', () => {
  const prisma = {
    practitionerProfile: {
      findUnique: jest.fn(),
    },
    practitionerPackage: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const repository = new PractitionerPackageRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters public package queries to active, non-archived packages', async () => {
    (prisma.practitionerPackage.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.practitionerPackage.count as jest.Mock).mockResolvedValue(0);

    await repository.listPublicActiveByPractitionerId({
      practitionerId: 'practitioner-1',
      page: 1,
      limit: 10,
    });

    expect(prisma.practitionerPackage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          practitionerId: 'practitioner-1',
          status: PractitionerPackageStatus.ACTIVE,
          archivedAt: null,
        },
      }),
    );
  });

  it('filters public slug lookups to visible practitioners who accept packages', async () => {
    (prisma.practitionerPackage.findFirst as jest.Mock).mockResolvedValue(null);

    await repository.findPublicByPractitionerSlugAndPackageSlug({
      practitionerSlug: 'dr-example',
      packageSlug: 'starter',
    });

    expect(prisma.practitionerPackage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: 'starter',
          status: PractitionerPackageStatus.ACTIVE,
          archivedAt: null,
          practitioner: expect.objectContaining({
            publicSlug: 'dr-example',
            acceptsPackages: true,
            status: PractitionerStatus.APPROVED,
            user: expect.objectContaining({
              status: UserStatus.ACTIVE,
            }),
          }),
        }),
      }),
    );
  });

  it('passes admin status filters through to admin package listing', async () => {
    (prisma.practitionerPackage.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.practitionerPackage.count as jest.Mock).mockResolvedValue(0);

    await repository.listAdminPackages({
      page: 1,
      limit: 10,
      status: PractitionerPackageStatus.DISABLED_BY_ADMIN,
    });

    expect(prisma.practitionerPackage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PractitionerPackageStatus.DISABLED_BY_ADMIN,
        }),
      }),
    );
  });
});

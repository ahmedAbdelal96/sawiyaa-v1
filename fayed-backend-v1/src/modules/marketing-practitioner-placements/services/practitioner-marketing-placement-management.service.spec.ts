import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PractitionerMarketingPlacementStatus } from '@prisma/client';
import { PractitionerMarketingPlacementManagementService } from './practitioner-marketing-placement-management.service';

describe('PractitionerMarketingPlacementManagementService', () => {
  const repository = {
    list: jest.fn(),
    findById: jest.fn(),
    findEligiblePractitioner: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createHistory: jest.fn(),
    listHistory: jest.fn(),
    toSnapshot: jest.fn((item) => ({
      practitionerId: item.practitionerId,
      surface: item.surface,
      status: item.status,
      startsAt: item.startsAt.toISOString(),
      endsAt: item.endsAt?.toISOString() ?? null,
      priority: item.priority,
      badgeLabelAr: item.badgeLabelAr,
      badgeLabelEn: item.badgeLabelEn,
      reason: item.reason,
      campaignName: item.campaignName,
      notesInternal: item.notesInternal,
      pausedAt: item.pausedAt?.toISOString() ?? null,
      pausedByAdminId: item.pausedByAdminId,
    })),
  };

  const service = new PractitionerMarketingPlacementManagementService(
    repository as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists with pagination and filters', async () => {
    repository.list.mockResolvedValue({
      items: [buildPlacement({ id: 'p1' })],
      total: 1,
    });

    const result = await service.list({
      page: 2,
      limit: 10,
      practitionerSearch: 'doc',
    });

    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 10,
        practitionerSearch: 'doc',
      }),
    );
    expect(result.total).toBe(1);
  });

  it('creates placement with defaults and writes CREATED history', async () => {
    repository.findEligiblePractitioner.mockResolvedValue({ id: 'pr1' });
    repository.create.mockResolvedValue(buildPlacement({ practitionerId: 'pr1' }));

    await service.create({
      actorUserId: 'admin-1',
      practitionerId: 'pr1',
      surface: 'HOME',
      startsAt: '2026-05-28T10:00:00.000Z',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        badgeLabelAr: 'مميز',
        badgeLabelEn: 'Featured',
        createdByAdminId: 'admin-1',
      }),
    );
    expect(repository.createHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATED',
      }),
    );
  });

  it('rejects create when date range is invalid', async () => {
    await expect(
      service.create({
        actorUserId: 'admin-1',
        practitionerId: 'pr1',
        surface: 'HOME',
        startsAt: '2026-05-28T10:00:00.000Z',
        endsAt: '2026-05-28T09:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates placement and writes change history', async () => {
    repository.findById.mockResolvedValue(buildPlacement({ id: 'pl-1' }));
    repository.update.mockResolvedValue(
      buildPlacement({ id: 'pl-1', priority: 2 }),
    );

    await service.update({
      id: 'pl-1',
      actorUserId: 'admin-1',
      priority: 2,
    });

    expect(repository.update).toHaveBeenCalled();
    expect(repository.createHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PRIORITY_CHANGED',
      }),
    );
  });

  it('pauses active placement and records PAUSED history', async () => {
    repository.findById.mockResolvedValue(
      buildPlacement({ id: 'pl-1', status: 'ACTIVE' }),
    );
    repository.update.mockResolvedValue(
      buildPlacement({ id: 'pl-1', status: 'PAUSED' }),
    );

    await service.pause({
      id: 'pl-1',
      actorUserId: 'admin-1',
      note: 'manual pause',
    });

    expect(repository.update).toHaveBeenCalledWith(
      'pl-1',
      expect.objectContaining({
        status: 'PAUSED',
      }),
    );
    expect(repository.createHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAUSED',
      }),
    );
  });

  it('resumes paused placement and rejects past-ended placement', async () => {
    repository.findById.mockResolvedValueOnce(
      buildPlacement({
        id: 'pl-1',
        status: 'PAUSED',
        endsAt: new Date(Date.now() + 3600_000),
      }),
    );
    repository.update.mockResolvedValue(
      buildPlacement({ id: 'pl-1', status: 'ACTIVE', pausedAt: null }),
    );

    await service.resume({
      id: 'pl-1',
      actorUserId: 'admin-1',
    });
    expect(repository.createHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESUMED' }),
    );

    repository.findById.mockResolvedValueOnce(
      buildPlacement({
        id: 'pl-2',
        status: 'PAUSED',
        endsAt: new Date(Date.now() - 3600_000),
      }),
    );
    await expect(
      service.resume({ id: 'pl-2', actorUserId: 'admin-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws not found on unknown placement for update/pause/resume', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.update({ id: 'missing', actorUserId: 'admin-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.pause({ id: 'missing', actorUserId: 'admin-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.resume({ id: 'missing', actorUserId: 'admin-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function buildPlacement(input?: {
  id?: string;
  practitionerId?: string;
  status?: PractitionerMarketingPlacementStatus;
  priority?: number;
  endsAt?: Date | null;
  pausedAt?: Date | null;
}) {
  return {
    id: input?.id ?? 'placement-1',
    practitionerId: input?.practitionerId ?? 'pr-1',
    surface: 'HOME',
    status: input?.status ?? 'ACTIVE',
    startsAt: new Date('2026-05-28T10:00:00.000Z'),
    endsAt: input?.endsAt ?? null,
    priority: input?.priority ?? 100,
    badgeLabelAr: 'مميز',
    badgeLabelEn: 'Featured',
    reason: 'FEATURED',
    campaignName: null,
    notesInternal: null,
    createdByAdminId: 'admin-1',
    pausedByAdminId: input?.pausedAt ? 'admin-1' : null,
    pausedAt: input?.pausedAt ?? null,
    createdAt: new Date('2026-05-28T10:00:00.000Z'),
    updatedAt: new Date('2026-05-28T10:00:00.000Z'),
    practitioner: {
      id: 'pr-1',
      publicSlug: 'dr-a',
      professionalTitle: 'Title',
      user: {
        id: 'u-1',
        displayName: 'Dr A',
      },
    },
    createdByAdmin: {
      id: 'admin-1',
      displayName: 'Admin',
    },
    pausedByAdmin: null,
  };
}


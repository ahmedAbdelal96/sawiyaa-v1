import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PractitionerMarketingPlacementHistoryAction,
  PractitionerMarketingPlacementStatus,
} from '@prisma/client';
import { PractitionerMarketingPlacementManagementRepository } from '../repositories/practitioner-marketing-placement-management.repository';

type CreatePlacementInput = {
  actorUserId: string;
  practitionerId?: string;
  practitionerSlug?: string;
  surface: 'HOME' | 'DISCOVERY' | 'ALL';
  startsAt: string;
  endsAt?: string;
  priority?: number;
  badgeLabelAr?: string;
  badgeLabelEn?: string;
  reason?:
    | 'FEATURED'
    | 'SPONSORED'
    | 'DISCOUNT'
    | 'NEW_SPECIALIST'
    | 'HIGH_AVAILABILITY'
    | 'EDITORIAL_PICK';
  campaignName?: string;
  notesInternal?: string;
  status?: PractitionerMarketingPlacementStatus;
};

type UpdatePlacementInput = {
  id: string;
  actorUserId: string;
  surface?: 'HOME' | 'DISCOVERY' | 'ALL';
  startsAt?: string;
  endsAt?: string;
  priority?: number;
  badgeLabelAr?: string;
  badgeLabelEn?: string;
  reason?:
    | 'FEATURED'
    | 'SPONSORED'
    | 'DISCOUNT'
    | 'NEW_SPECIALIST'
    | 'HIGH_AVAILABILITY'
    | 'EDITORIAL_PICK';
  campaignName?: string;
  notesInternal?: string;
  status?: PractitionerMarketingPlacementStatus;
};

@Injectable()
export class PractitionerMarketingPlacementManagementService {
  constructor(
    private readonly repository: PractitionerMarketingPlacementManagementRepository,
  ) {}

  list(input: {
    status?: PractitionerMarketingPlacementStatus;
    surface?: 'HOME' | 'DISCOVERY' | 'ALL';
    reason?:
      | 'FEATURED'
      | 'SPONSORED'
      | 'DISCOUNT'
      | 'NEW_SPECIALIST'
      | 'HIGH_AVAILABILITY'
      | 'EDITORIAL_PICK';
    practitionerSearch?: string;
    startsFrom?: Date;
    endsTo?: Date;
    page: number;
    limit: number;
  }) {
    return this.repository.list(input);
  }

  async getById(id: string) {
    const placement = await this.repository.findById(id);
    if (!placement) {
      throw new NotFoundException({ error: 'FEATURED_PLACEMENT_NOT_FOUND' });
    }
    return placement;
  }

  async create(input: CreatePlacementInput) {
    this.validateCreateInput(input);

    const startsAt = new Date(input.startsAt);
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    this.assertValidDateRange(startsAt, endsAt);

    const practitioner = await this.repository.findEligiblePractitioner({
      id: input.practitionerId,
      slug: input.practitionerSlug,
    });
    if (!practitioner) {
      throw new BadRequestException({
        error: 'FEATURED_PLACEMENT_INVALID_PRACTITIONER',
      });
    }

    const created = await this.repository.create({
      practitionerId: practitioner.id,
      surface: input.surface,
      status: input.status ?? PractitionerMarketingPlacementStatus.ACTIVE,
      startsAt,
      endsAt,
      priority: input.priority ?? 100,
      badgeLabelAr: input.badgeLabelAr?.trim() || 'مميز',
      badgeLabelEn: input.badgeLabelEn?.trim() || 'Featured',
      reason: input.reason ?? 'FEATURED',
      campaignName: input.campaignName?.trim() || null,
      notesInternal: input.notesInternal?.trim() || null,
      createdByAdminId: input.actorUserId,
    });

    await this.repository.createHistory({
      placementId: created.id,
      action: PractitionerMarketingPlacementHistoryAction.CREATED,
      actorUserId: input.actorUserId,
      afterSnapshot: this.repository.toSnapshot(created),
    });

    return created;
  }

  async update(input: UpdatePlacementInput) {
    const existing = await this.getById(input.id);

    const startsAt = input.startsAt
      ? new Date(input.startsAt)
      : existing.startsAt;
    const endsAt =
      input.endsAt !== undefined
        ? input.endsAt
          ? new Date(input.endsAt)
          : null
        : existing.endsAt;
    this.assertValidDateRange(startsAt, endsAt);

    const before = this.repository.toSnapshot(existing);
    const updated = await this.repository.update(input.id, {
      surface: input.surface,
      status: input.status,
      startsAt,
      endsAt,
      priority: input.priority,
      badgeLabelAr:
        input.badgeLabelAr !== undefined
          ? input.badgeLabelAr.trim() || 'مميز'
          : undefined,
      badgeLabelEn:
        input.badgeLabelEn !== undefined
          ? input.badgeLabelEn.trim() || 'Featured'
          : undefined,
      reason: input.reason,
      campaignName:
        input.campaignName !== undefined
          ? input.campaignName.trim() || null
          : undefined,
      notesInternal:
        input.notesInternal !== undefined
          ? input.notesInternal.trim() || null
          : undefined,
    });

    await this.repository.createHistory({
      placementId: updated.id,
      action: this.resolveUpdateAction(existing, updated),
      actorUserId: input.actorUserId,
      beforeSnapshot: before,
      afterSnapshot: this.repository.toSnapshot(updated),
    });

    return updated;
  }

  async pause(input: { id: string; actorUserId: string; note?: string }) {
    const existing = await this.getById(input.id);
    if (existing.status === PractitionerMarketingPlacementStatus.PAUSED) {
      return existing;
    }

    const before = this.repository.toSnapshot(existing);
    const updated = await this.repository.update(input.id, {
      status: PractitionerMarketingPlacementStatus.PAUSED,
      pausedAt: new Date(),
      pausedByAdminId: input.actorUserId,
    });

    await this.repository.createHistory({
      placementId: updated.id,
      action: PractitionerMarketingPlacementHistoryAction.PAUSED,
      actorUserId: input.actorUserId,
      note: input.note,
      beforeSnapshot: before,
      afterSnapshot: this.repository.toSnapshot(updated),
    });

    return updated;
  }

  async resume(input: { id: string; actorUserId: string; note?: string }) {
    const existing = await this.getById(input.id);

    if (existing.endsAt && existing.endsAt.getTime() < Date.now()) {
      throw new BadRequestException({
        error: 'FEATURED_PLACEMENT_EXPIRED_CANNOT_RESUME',
      });
    }

    if (existing.status === PractitionerMarketingPlacementStatus.ACTIVE) {
      return existing;
    }

    const before = this.repository.toSnapshot(existing);
    const updated = await this.repository.update(input.id, {
      status: PractitionerMarketingPlacementStatus.ACTIVE,
      pausedAt: null,
      pausedByAdminId: null,
    });

    await this.repository.createHistory({
      placementId: updated.id,
      action: PractitionerMarketingPlacementHistoryAction.RESUMED,
      actorUserId: input.actorUserId,
      note: input.note,
      beforeSnapshot: before,
      afterSnapshot: this.repository.toSnapshot(updated),
    });

    return updated;
  }

  async getHistory(placementId: string) {
    await this.getById(placementId);
    return this.repository.listHistory(placementId);
  }

  private validateCreateInput(input: CreatePlacementInput) {
    if (!input.practitionerId && !input.practitionerSlug) {
      throw new BadRequestException({
        error: 'FEATURED_PLACEMENT_PRACTITIONER_REQUIRED',
      });
    }

    if (input.status === PractitionerMarketingPlacementStatus.EXPIRED) {
      throw new BadRequestException({
        error: 'FEATURED_PLACEMENT_INVALID_INITIAL_STATUS',
      });
    }
  }

  private assertValidDateRange(startsAt: Date, endsAt: Date | null) {
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException({
        error: 'FEATURED_PLACEMENT_INVALID_DATE_RANGE',
      });
    }
  }

  private resolveUpdateAction(
    before: { priority: number; startsAt: Date; endsAt: Date | null },
    after: { priority: number; startsAt: Date; endsAt: Date | null },
  ) {
    if (before.priority !== after.priority) {
      return PractitionerMarketingPlacementHistoryAction.PRIORITY_CHANGED;
    }

    if (
      before.startsAt.getTime() !== after.startsAt.getTime() ||
      (before.endsAt?.getTime() ?? null) !== (after.endsAt?.getTime() ?? null)
    ) {
      return PractitionerMarketingPlacementHistoryAction.DATE_CHANGED;
    }

    return PractitionerMarketingPlacementHistoryAction.UPDATED;
  }
}


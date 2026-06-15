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

/** Maximum active featured placements allowed on HOME surface at any time. */
export const FEATURED_HOME_MAX_SLOTS = 5;

type CreatePlacementInput = {
  actorUserId: string;
  practitionerId: string;
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
    });
    if (!practitioner) {
      throw new BadRequestException({
        error: 'FEATURED_PLACEMENT_INVALID_PRACTITIONER',
      });
    }

    const overlappingPlacement =
      await this.repository.findActiveOverlappingPlacement({
        practitionerId: practitioner.id,
        surface: input.surface,
        startsAt,
        endsAt,
      });
    if (overlappingPlacement) {
      throw new BadRequestException({
        error: 'FEATURED_PLACEMENT_OVERLAPPING_ACTIVE',
      });
    }

    // Enforce HOME/ALL rules: priority range + slots limit
    if (input.surface === 'HOME' || input.surface === 'ALL') {
      await this.assertHomePlacementRules({
        surface: input.surface,
        status: input.status ?? PractitionerMarketingPlacementStatus.ACTIVE,
        priority: input.priority ?? 1,
        startsAt,
        endsAt,
      });
    }

    const created = await this.repository.create({
      practitionerId: practitioner.id,
      surface: input.surface,
      status: input.status ?? PractitionerMarketingPlacementStatus.ACTIVE,
      startsAt,
      endsAt,
      priority:
        input.priority ??
        (input.surface === 'HOME' || input.surface === 'ALL' ? 1 : 100),
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

    const overlappingPlacement =
      await this.repository.findActiveOverlappingPlacement({
        practitionerId: existing.practitionerId,
        surface: input.surface ?? existing.surface,
        startsAt,
        endsAt,
        excludePlacementId: existing.id,
      });
    if (overlappingPlacement) {
      throw new BadRequestException({
        error: 'FEATURED_PLACEMENT_OVERLAPPING_ACTIVE',
      });
    }

    // Determine effective surface and status after this update
    const effectiveSurface = input.surface ?? existing.surface;
    const effectiveStatus = input.status ?? existing.status;
    const effectivePriority = input.priority ?? existing.priority;

    // Enforce HOME/ALL rules when the resulting placement would be ACTIVE on HOME/ALL
    if (
      (effectiveSurface === 'HOME' || effectiveSurface === 'ALL') &&
      effectiveStatus === PractitionerMarketingPlacementStatus.ACTIVE
    ) {
      await this.assertHomePlacementRules({
        surface: effectiveSurface,
        status: effectiveStatus,
        priority: effectivePriority,
        startsAt,
        endsAt,
        excludePlacementId: existing.id,
      });
    }

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

    const overlappingPlacement =
      await this.repository.findActiveOverlappingPlacement({
        practitionerId: existing.practitionerId,
        surface: existing.surface,
        startsAt: existing.startsAt,
        endsAt: existing.endsAt,
        excludePlacementId: existing.id,
      });
    if (overlappingPlacement) {
      throw new BadRequestException({
        error: 'FEATURED_PLACEMENT_OVERLAPPING_ACTIVE',
      });
    }

    // Enforce HOME/ALL rules when resuming onto HOME/ALL
    if (existing.surface === 'HOME' || existing.surface === 'ALL') {
      await this.assertHomePlacementRules({
        surface: existing.surface,
        status: PractitionerMarketingPlacementStatus.ACTIVE,
        priority: existing.priority,
        startsAt: existing.startsAt,
        endsAt: existing.endsAt,
        excludePlacementId: existing.id,
      });
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

  /**
   * Shared validation for HOME/ALL surfaces when the resulting placement
   * would be ACTIVE. Enforces:
   *   1. priority range (1..FEATURED_HOME_MAX_SLOTS)
   *   2. slots limit (FEATURED_HOME_MAX_SLOTS overlapping ACTIVE placements)
   *   3. unique slot collision (no two ACTIVE placements share the same slot)
   */
  private async assertHomePlacementRules(input: {
    surface: 'HOME' | 'ALL';
    status: PractitionerMarketingPlacementStatus;
    priority: number;
    startsAt: Date;
    endsAt: Date | null;
    excludePlacementId?: string;
  }) {
    // 1. Priority must be within valid range for HOME/ALL ACTIVE placements
    if (input.priority < 1 || input.priority > FEATURED_HOME_MAX_SLOTS) {
      throw new BadRequestException({
        error: 'FEATURED_PLACEMENT_PRIORITY_OUT_OF_RANGE',
        message: `Priority must be between 1 and ${FEATURED_HOME_MAX_SLOTS} for HOME/ALL placements.`,
      });
    }

    // 2. Slots limit: count overlapping ACTIVE HOME/ALL placements
    const activeCount = await this.repository.countActivePlacementsForSurface({
      surface: input.surface,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      excludePlacementId: input.excludePlacementId,
    });

    if (activeCount >= FEATURED_HOME_MAX_SLOTS) {
      throw new BadRequestException({
        error: 'FEATURED_PLACEMENT_HOME_SLOTS_FULL',
        message: `Maximum of ${FEATURED_HOME_MAX_SLOTS} active HOME placements allowed. Please pause or end an existing placement first.`,
      });
    }

    // 3. Unique slot collision: no two ACTIVE placements may share the same
    //    display slot on HOME/ALL during overlapping periods
    const collision = await this.repository.findActiveSlotCollision({
      surface: input.surface,
      priority: input.priority,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      excludePlacementId: input.excludePlacementId,
    });

    if (collision) {
      throw new BadRequestException({
        error: 'FEATURED_PLACEMENT_SLOT_ALREADY_TAKEN',
        message: `Display slot ${input.priority} is already taken during this period.`,
      });
    }
  }

  private validateCreateInput(input: CreatePlacementInput) {
    if (!input.practitionerId) {
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

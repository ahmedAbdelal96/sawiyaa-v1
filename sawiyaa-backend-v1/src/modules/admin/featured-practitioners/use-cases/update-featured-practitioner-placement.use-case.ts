import { Injectable } from '@nestjs/common';
import { PractitionerMarketingPlacementManagementService } from '@modules/marketing-practitioner-placements/services/practitioner-marketing-placement-management.service';
import { UpdateFeaturedPractitionerPlacementDto } from '../dto/featured-practitioners-admin.dto';
import { presentPlacement } from './featured-practitioner-placement.presenter';

@Injectable()
export class UpdateFeaturedPractitionerPlacementUseCase {
  constructor(
    private readonly managementService: PractitionerMarketingPlacementManagementService,
  ) {}

  async execute(input: {
    id: string;
    actorUserId: string;
    payload: UpdateFeaturedPractitionerPlacementDto;
  }) {
    const updated = await this.managementService.update({
      id: input.id,
      actorUserId: input.actorUserId,
      surface: input.payload.surface,
      startsAt: input.payload.startsAt,
      endsAt: input.payload.endsAt,
      priority: input.payload.priority,
      badgeLabelAr: input.payload.badgeLabelAr,
      badgeLabelEn: input.payload.badgeLabelEn,
      reason: input.payload.reason,
      campaignName: input.payload.campaignName,
      notesInternal: input.payload.notesInternal,
      status: input.payload.status,
    });

    return presentPlacement(updated);
  }
}


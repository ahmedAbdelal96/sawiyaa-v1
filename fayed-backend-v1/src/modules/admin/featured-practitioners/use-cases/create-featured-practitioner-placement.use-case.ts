import { Injectable } from '@nestjs/common';
import { PractitionerMarketingPlacementManagementService } from '@modules/marketing-practitioner-placements/services/practitioner-marketing-placement-management.service';
import { CreateFeaturedPractitionerPlacementDto } from '../dto/featured-practitioners-admin.dto';
import { presentPlacement } from './featured-practitioner-placement.presenter';

@Injectable()
export class CreateFeaturedPractitionerPlacementUseCase {
  constructor(
    private readonly managementService: PractitionerMarketingPlacementManagementService,
  ) {}

  async execute(input: {
    actorUserId: string;
    payload: CreateFeaturedPractitionerPlacementDto;
  }) {
    const created = await this.managementService.create({
      actorUserId: input.actorUserId,
      practitionerId: input.payload.practitionerId,
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

    return presentPlacement(created);
  }
}

import { Injectable } from '@nestjs/common';
import { PractitionerMarketingPlacementManagementService } from '@modules/marketing-practitioner-placements/services/practitioner-marketing-placement-management.service';
import { presentPlacement } from './featured-practitioner-placement.presenter';

@Injectable()
export class PauseFeaturedPractitionerPlacementUseCase {
  constructor(
    private readonly managementService: PractitionerMarketingPlacementManagementService,
  ) {}

  async execute(input: { id: string; actorUserId: string; note?: string }) {
    const updated = await this.managementService.pause(input);
    return presentPlacement(updated);
  }
}


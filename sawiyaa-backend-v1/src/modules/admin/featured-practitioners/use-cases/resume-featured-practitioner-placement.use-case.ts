import { Injectable } from '@nestjs/common';
import { PractitionerMarketingPlacementManagementService } from '@modules/marketing-practitioner-placements/services/practitioner-marketing-placement-management.service';
import { presentPlacement } from './featured-practitioner-placement.presenter';

@Injectable()
export class ResumeFeaturedPractitionerPlacementUseCase {
  constructor(
    private readonly managementService: PractitionerMarketingPlacementManagementService,
  ) {}

  async execute(input: { id: string; actorUserId: string; note?: string }) {
    const updated = await this.managementService.resume(input);
    return presentPlacement(updated);
  }
}


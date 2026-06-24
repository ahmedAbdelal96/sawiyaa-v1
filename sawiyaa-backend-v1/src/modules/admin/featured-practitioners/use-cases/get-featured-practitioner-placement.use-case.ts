import { Injectable } from '@nestjs/common';
import { PractitionerMarketingPlacementManagementService } from '@modules/marketing-practitioner-placements/services/practitioner-marketing-placement-management.service';
import { presentPlacement } from './featured-practitioner-placement.presenter';

@Injectable()
export class GetFeaturedPractitionerPlacementUseCase {
  constructor(
    private readonly managementService: PractitionerMarketingPlacementManagementService,
  ) {}

  async execute(id: string) {
    const placement = await this.managementService.getById(id);
    return presentPlacement(placement);
  }
}


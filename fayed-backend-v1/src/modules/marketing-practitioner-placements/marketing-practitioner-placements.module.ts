import { Module } from '@nestjs/common';
import { PractitionerMarketingPlacementRepository } from './repositories/practitioner-marketing-placement.repository';
import { PractitionerMarketingPlacementManagementRepository } from './repositories/practitioner-marketing-placement-management.repository';
import { PractitionerMarketingPlacementManagementService } from './services/practitioner-marketing-placement-management.service';

@Module({
  providers: [
    PractitionerMarketingPlacementRepository,
    PractitionerMarketingPlacementManagementRepository,
    PractitionerMarketingPlacementManagementService,
  ],
  exports: [
    PractitionerMarketingPlacementRepository,
    PractitionerMarketingPlacementManagementRepository,
    PractitionerMarketingPlacementManagementService,
  ],
})
export class MarketingPractitionerPlacementsModule {}

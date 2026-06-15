import { Module } from '@nestjs/common';
import { PractitionerMarketingPlacementRepository } from './repositories/practitioner-marketing-placement.repository';
import { PractitionerMarketingPlacementManagementRepository } from './repositories/practitioner-marketing-placement-management.repository';
import { PractitionerMarketingPlacementManagementService } from './services/practitioner-marketing-placement-management.service';
import { PublicFeaturedPractitionersController } from './controllers/public-featured-practitioners.controller';
import { ListPublicFeaturedPractitionersUseCase } from './use-cases/list-public-featured-practitioners.use-case';

@Module({
  controllers: [PublicFeaturedPractitionersController],
  providers: [
    PractitionerMarketingPlacementRepository,
    PractitionerMarketingPlacementManagementRepository,
    PractitionerMarketingPlacementManagementService,
    ListPublicFeaturedPractitionersUseCase,
  ],
  exports: [
    PractitionerMarketingPlacementRepository,
    PractitionerMarketingPlacementManagementRepository,
    PractitionerMarketingPlacementManagementService,
  ],
})
export class MarketingPractitionerPlacementsModule {}
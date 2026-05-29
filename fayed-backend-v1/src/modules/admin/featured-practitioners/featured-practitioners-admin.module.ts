import { Module } from '@nestjs/common';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { MarketingPractitionerPlacementsModule } from '@modules/marketing-practitioner-placements/marketing-practitioner-placements.module';
import { AdminFeaturedPractitionersController } from './controllers/admin-featured-practitioners.controller';
import { CreateFeaturedPractitionerPlacementUseCase } from './use-cases/create-featured-practitioner-placement.use-case';
import { GetFeaturedPractitionerPlacementUseCase } from './use-cases/get-featured-practitioner-placement.use-case';
import { GetFeaturedPractitionerPlacementHistoryUseCase } from './use-cases/get-featured-practitioner-placement-history.use-case';
import { ListFeaturedPractitionerPlacementsUseCase } from './use-cases/list-featured-practitioner-placements.use-case';
import { PauseFeaturedPractitionerPlacementUseCase } from './use-cases/pause-featured-practitioner-placement.use-case';
import { ResumeFeaturedPractitionerPlacementUseCase } from './use-cases/resume-featured-practitioner-placement.use-case';
import { UpdateFeaturedPractitionerPlacementUseCase } from './use-cases/update-featured-practitioner-placement.use-case';

@Module({
  imports: [MarketingPractitionerPlacementsModule],
  controllers: [AdminFeaturedPractitionersController],
  providers: [
    PermissionsGuard,
    PermissionResolverService,
    ListFeaturedPractitionerPlacementsUseCase,
    GetFeaturedPractitionerPlacementUseCase,
    CreateFeaturedPractitionerPlacementUseCase,
    UpdateFeaturedPractitionerPlacementUseCase,
    PauseFeaturedPractitionerPlacementUseCase,
    ResumeFeaturedPractitionerPlacementUseCase,
    GetFeaturedPractitionerPlacementHistoryUseCase,
  ],
})
export class FeaturedPractitionersAdminModule {}

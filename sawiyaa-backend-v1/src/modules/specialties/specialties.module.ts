import { Module } from '@nestjs/common';
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { SpecialtyMapper } from './mappers/specialty.mapper';
import { SpecialtyCategoryRepository } from './repositories/specialty-category.repository';
import { SpecialtyRepository } from './repositories/specialty.repository';
import { CreateSpecialtyUseCase } from './use-cases/create-specialty.use-case';
import { CreateSpecialtyCategoryUseCase } from './use-cases/create-specialty-category.use-case';
import { GetSpecialtyBySlugUseCase } from './use-cases/get-specialty-by-slug.use-case';
import { ListAdminSpecialtiesUseCase } from './use-cases/list-admin-specialties.use-case';
import { ListAdminSpecialtyCategoriesUseCase } from './use-cases/list-admin-specialty-categories.use-case';
import { ListSpecialtiesUseCase } from './use-cases/list-specialties.use-case';
import { ListSpecialtyCategoriesUseCase } from './use-cases/list-specialty-categories.use-case';
import { ToggleSpecialtyStatusUseCase } from './use-cases/toggle-specialty-status.use-case';
import { UpdateSpecialtyCategoryUseCase } from './use-cases/update-specialty-category.use-case';
import { UpdateSpecialtyUseCase } from './use-cases/update-specialty.use-case';
import { SpecialtiesAdminController } from './controllers/specialties-admin.controller';
import { SpecialtiesPublicController } from './controllers/specialties-public.controller';

/**
 * Specialties Module is the source of truth for practitioner specialties catalog only.
 * It is intentionally isolated from article categories, course categories, and practitioner-linkage workflows.
 */
@Module({
  controllers: [SpecialtiesPublicController, SpecialtiesAdminController],
  providers: [
    JwtAccessAuthGuard,
    AdminGuard,
    ActiveAccountGuard,
    SpecialtyMapper,
    SpecialtyRepository,
    SpecialtyCategoryRepository,
    CreateSpecialtyCategoryUseCase,
    ListAdminSpecialtiesUseCase,
    ListAdminSpecialtyCategoriesUseCase,
    ListSpecialtiesUseCase,
    ListSpecialtyCategoriesUseCase,
    GetSpecialtyBySlugUseCase,
    CreateSpecialtyUseCase,
    UpdateSpecialtyCategoryUseCase,
    UpdateSpecialtyUseCase,
    ToggleSpecialtyStatusUseCase,
  ],
})
export class SpecialtiesModule {}

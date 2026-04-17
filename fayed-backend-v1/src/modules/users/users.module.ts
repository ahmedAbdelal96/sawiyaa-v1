import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { CurrentUserAvatarController } from './controllers/current-user-avatar.controller';
import { CurrentUserController } from './controllers/current-user.controller';
import { CurrentUserMapper } from './mappers/current-user.mapper';
import { PatientProfileRepository } from './repositories/patient-profile.repository';
import { PractitionerProfileRepository } from './repositories/practitioner-profile.repository';
import { UserRepository } from './repositories/user.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { UserAvatarStorageService } from './services/user-avatar-storage.service';
import { GetCurrentUserProfileLinksUseCase } from './use-cases/get-current-user-profile-links.use-case';
import { GetCurrentUserAvatarFileUseCase } from './use-cases/get-current-user-avatar-file.use-case';
import { GetCurrentUserSecurityStateUseCase } from './use-cases/get-current-user-security-state.use-case';
import { GetCurrentUserSummaryUseCase } from './use-cases/get-current-user-summary.use-case';
import { GetCurrentUserUseCase } from './use-cases/get-current-user.use-case';
import { ListCurrentUserRolesUseCase } from './use-cases/list-current-user-roles.use-case';
import { PatchCurrentUserProfileUseCase } from './use-cases/patch-current-user-profile.use-case';
import { RemoveCurrentUserAvatarUseCase } from './use-cases/remove-current-user-avatar.use-case';
import { UpdateCurrentUserAvatarUseCase } from './use-cases/update-current-user-avatar.use-case';

/**
 * Users Module is the authenticated read surface for current-user data.
 * It intentionally depends on shared auth context and common guards, but it does not own any auth flow behavior.
 */
@Module({
  controllers: [CurrentUserController, CurrentUserAvatarController],
  providers: [
    JwtAccessAuthGuard,
    CurrentUserMapper,
    UserRepository,
    UserRoleRepository,
    PatientProfileRepository,
    PractitionerProfileRepository,
    UserAvatarStorageService,
    GetCurrentUserUseCase,
    GetCurrentUserSummaryUseCase,
    ListCurrentUserRolesUseCase,
    GetCurrentUserSecurityStateUseCase,
    GetCurrentUserProfileLinksUseCase,
    PatchCurrentUserProfileUseCase,
    UpdateCurrentUserAvatarUseCase,
    RemoveCurrentUserAvatarUseCase,
    GetCurrentUserAvatarFileUseCase,
  ],
})
export class UsersModule {}

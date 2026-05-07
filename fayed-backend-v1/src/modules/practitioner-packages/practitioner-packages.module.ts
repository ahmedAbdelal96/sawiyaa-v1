import { Module } from '@nestjs/common';
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PractitionerApprovedGuard } from '@common/guards/practitioner/practitioner-approved.guard';
import { PractitionerOtpVerifiedGuard } from '@common/guards/practitioner/practitioner-otp-verified.guard';
import { ConfigModule } from '@modules/config/config.module';
import { PractitionersModule } from '@modules/practitioners/practitioners.module';
import { AdminPackagePolicyController } from './controllers/admin-package-policy.controller';
import { AdminPractitionerPackagesController } from './controllers/admin-practitioner-packages.controller';
import { PublicPractitionerPackagesController } from './controllers/public-practitioner-packages.controller';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { PractitionerPackagesController } from './controllers/practitioner-packages.controller';
import { PractitionerPackagePresenter } from './presenters/practitioner-package.presenter';
import { PackageLimitPolicy } from './policies/package-limit.policy';
import { PackagePolicyService } from './services/package-policy.service';
import { PractitionerPackageRepository } from './repositories/practitioner-package.repository';
import { ValidatePractitionerPackageService } from './services/validate-practitioner-package.service';
import { DisablePractitionerPackageUseCase } from './use-cases/disable-practitioner-package.use-case';
import { ActivatePractitionerPackageUseCase } from './use-cases/activate-practitioner-package.use-case';
import { ArchivePractitionerPackageUseCase } from './use-cases/archive-practitioner-package.use-case';
import { CreatePractitionerPackageUseCase } from './use-cases/create-practitioner-package.use-case';
import { EnablePractitionerPackageUseCase } from './use-cases/enable-practitioner-package.use-case';
import { GetAdminPractitionerPackageUseCase } from './use-cases/get-admin-practitioner-package.use-case';
import { GetPackagePolicyUseCase } from './use-cases/get-package-policy.use-case';
import { GetMyPractitionerPackageUseCase } from './use-cases/get-my-practitioner-package.use-case';
import { GetPublicPractitionerPackageUseCase } from './use-cases/get-public-practitioner-package.use-case';
import { ListMyPractitionerPackagesUseCase } from './use-cases/list-my-practitioner-packages.use-case';
import { ListAdminPractitionerPackagesUseCase } from './use-cases/list-admin-practitioner-packages.use-case';
import { ListPublicPractitionerPackagesUseCase } from './use-cases/list-public-practitioner-packages.use-case';
import { PausePractitionerPackageUseCase } from './use-cases/pause-practitioner-package.use-case';
import { UpdatePackagePolicyUseCase } from './use-cases/update-package-policy.use-case';
import { UpdatePractitionerPackageUseCase } from './use-cases/update-practitioner-package.use-case';

@Module({
  imports: [ConfigModule, SessionsModule, PractitionersModule],
  controllers: [
    PractitionerPackagesController,
    PublicPractitionerPackagesController,
    AdminPractitionerPackagesController,
    AdminPackagePolicyController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    ActiveAccountGuard,
    PractitionerApprovedGuard,
    PractitionerOtpVerifiedGuard,
    PractitionerPackagePresenter,
    PractitionerPackageRepository,
    PackageLimitPolicy,
    PackagePolicyService,
    ValidatePractitionerPackageService,
    CreatePractitionerPackageUseCase,
    UpdatePractitionerPackageUseCase,
    ActivatePractitionerPackageUseCase,
    PausePractitionerPackageUseCase,
    ArchivePractitionerPackageUseCase,
    ListMyPractitionerPackagesUseCase,
    GetMyPractitionerPackageUseCase,
    ListPublicPractitionerPackagesUseCase,
    GetPublicPractitionerPackageUseCase,
    ListAdminPractitionerPackagesUseCase,
    GetAdminPractitionerPackageUseCase,
    DisablePractitionerPackageUseCase,
    EnablePractitionerPackageUseCase,
    GetPackagePolicyUseCase,
    UpdatePackagePolicyUseCase,
  ],
})
export class PractitionerPackagesModule {}

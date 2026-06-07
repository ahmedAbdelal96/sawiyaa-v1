import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { PatientsModule } from '@modules/patients/patients.module';
import { AdminPatientsController } from './controllers/admin-patients.controller';
import { AdminCountriesController } from './controllers/admin-countries.controller';
import { AdminPatientCountryChangeDto } from './dto/admin-patient-country-change.dto';
import { AdminPatientDirectoryRepository } from './repositories/admin-patient-directory.repository';
import { GetAdminPatientDetailsUseCase } from './use-cases/get-admin-patient-details.use-case';
import { ListAdminPatientsUseCase } from './use-cases/list-admin-patients.use-case';
import { AdminPatientCountryChangeUseCase } from './use-cases/admin-patient-country-change.use-case';

/**
 * Patients admin module:
 * Back-office read surfaces for customers (patients), kept inside the patients domain.
 */
@Module({
  imports: [PatientsModule],
  controllers: [AdminPatientsController, AdminCountriesController],
  providers: [
    JwtAccessAuthGuard,
    PermissionsGuard,
    RolesGuard,
    PermissionResolverService,
    SecurityAuditService,
    AdminPatientCountryChangeDto,
    AdminPatientDirectoryRepository,
    ListAdminPatientsUseCase,
    GetAdminPatientDetailsUseCase,
    AdminPatientCountryChangeUseCase,
  ],
})
export class PatientsAdminModule {}

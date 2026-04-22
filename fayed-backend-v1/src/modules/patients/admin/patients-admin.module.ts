import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminPatientsController } from './controllers/admin-patients.controller';
import { AdminPatientDirectoryRepository } from './repositories/admin-patient-directory.repository';
import { GetAdminPatientDetailsUseCase } from './use-cases/get-admin-patient-details.use-case';
import { ListAdminPatientsUseCase } from './use-cases/list-admin-patients.use-case';

/**
 * Patients admin module:
 * Back-office read surfaces for customers (patients), kept inside the patients domain.
 */
@Module({
  controllers: [AdminPatientsController],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    AdminPatientDirectoryRepository,
    ListAdminPatientsUseCase,
    GetAdminPatientDetailsUseCase,
  ],
})
export class PatientsAdminModule {}

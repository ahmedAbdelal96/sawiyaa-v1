import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PaymentsModule } from '@modules/payments/payments.module';
import { PatientsModule } from '@modules/patients/patients.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { AcademyLearnerResolverService } from './services/academy-learner-resolver.service';
import { AdminAcademyProgramsController } from './programs/controllers/admin-academy-programs.controller';
import { PatientAcademyProgramsController } from './programs/controllers/patient-academy-programs.controller';
import { PublicAcademyProgramsController } from './programs/controllers/public-academy-programs.controller';
import { ArchiveAcademyProgramUseCase } from './programs/use-cases/archive-academy-program.use-case';
import { CreateAdminAcademyProgramEnrollmentUseCase } from './programs/use-cases/create-admin-academy-program-enrollment.use-case';
import { CreateAcademyProgramEnrollmentUseCase } from './programs/use-cases/create-academy-program-enrollment.use-case';
import { CreateAcademyProgramSessionUseCase } from './programs/use-cases/create-academy-program-session.use-case';
import { CreateAcademyProgramUseCase } from './programs/use-cases/create-academy-program.use-case';
import { GetAdminAcademyProgramEnrollmentUseCase } from './programs/use-cases/get-admin-academy-program-enrollment.use-case';
import { GetAdminAcademyProgramUseCase } from './programs/use-cases/get-admin-academy-program.use-case';
import { GetAdminAcademyProgramAttendanceUseCase } from './programs/use-cases/get-admin-academy-program-attendance.use-case';
import { GetAcademyProgramEnrollmentCertificateFileUseCase } from './programs/use-cases/get-academy-program-enrollment-certificate-file.use-case';
import { GetPublicAcademyProgramBySlugUseCase } from './programs/use-cases/get-public-academy-program-by-slug.use-case';
import { GetPublicAcademyProgramEnrollmentPaymentRedirectUseCase } from './programs/use-cases/get-public-academy-program-enrollment-payment-redirect.use-case';
import { GetPublicAcademyProgramEnrollmentUseCase } from './programs/use-cases/get-public-academy-program-enrollment.use-case';
import { GetPatientAcademyProgramEnrollmentPaymentRedirectUseCase } from './programs/use-cases/get-patient-academy-program-enrollment-payment-redirect.use-case';
import { GetPatientAcademyProgramEnrollmentUseCase } from './programs/use-cases/get-patient-academy-program-enrollment.use-case';
import { ListAdminAcademyProgramsUseCase } from './programs/use-cases/list-admin-academy-programs.use-case';
import { ListAdminAcademyProgramEnrollmentsUseCase } from './programs/use-cases/list-admin-academy-program-enrollments.use-case';
import { ListPatientAcademyProgramEnrollmentsUseCase } from './programs/use-cases/list-patient-academy-program-enrollments.use-case';
import { ManageAdminAcademyProgramEnrollmentsUseCase } from './programs/use-cases/manage-admin-academy-program-enrollments.use-case';
import { ListPublicAcademyProgramsUseCase } from './programs/use-cases/list-public-academy-programs.use-case';
import { PublishAcademyProgramUseCase } from './programs/use-cases/publish-academy-program.use-case';
import { UpdateAdminAcademyProgramEnrollmentLearnerUseCase } from './programs/use-cases/update-admin-academy-program-enrollment-learner.use-case';
import { SaveAdminAcademyProgramAttendanceUseCase } from './programs/use-cases/save-admin-academy-program-attendance.use-case';
import { UploadAdminAcademyProgramEnrollmentCertificateUseCase } from './programs/use-cases/upload-admin-academy-program-enrollment-certificate.use-case';
import { UpdateAcademyProgramSessionUseCase } from './programs/use-cases/update-academy-program-session.use-case';
import { UpdateAcademyProgramUseCase } from './programs/use-cases/update-academy-program.use-case';
import { AcademyProgramPresenter } from './programs/presenters/academy-program.presenter';
import { AcademyProgramEnrollmentPresenter } from './programs/presenters/academy-program-enrollment.presenter';
import { AcademyProgramRepository } from './programs/repositories/academy-program.repository';
import { AcademyProgramEnrollmentRepository } from './programs/repositories/academy-program-enrollment.repository';
import { AcademyProgramSessionAttendanceRepository } from './programs/repositories/academy-program-session-attendance.repository';
import { AcademyProgramCertificateStorageService } from './programs/services/academy-program-certificate-storage.service';
import { AcademyProgramCoverStorageService } from './programs/services/academy-program-cover-storage.service';
import { AcademyProgramTargetLearnerAlertService } from './programs/services/academy-program-target-learner-alert.service';

@Module({
  imports: [PaymentsModule, PatientsModule, NotificationsModule],
  controllers: [
    PublicAcademyProgramsController,
    AdminAcademyProgramsController,
    PatientAcademyProgramsController,
  ],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    AcademyLearnerResolverService,
    AcademyProgramPresenter,
    AcademyProgramRepository,
    AcademyProgramEnrollmentPresenter,
    AcademyProgramEnrollmentRepository,
    AcademyProgramSessionAttendanceRepository,
    AcademyProgramCertificateStorageService,
    AcademyProgramCoverStorageService,
    AcademyProgramTargetLearnerAlertService,
    ListPublicAcademyProgramsUseCase,
    GetPublicAcademyProgramBySlugUseCase,
    CreateAcademyProgramEnrollmentUseCase,
    CreateAdminAcademyProgramEnrollmentUseCase,
    GetPublicAcademyProgramEnrollmentUseCase,
    GetPublicAcademyProgramEnrollmentPaymentRedirectUseCase,
    GetPatientAcademyProgramEnrollmentUseCase,
    GetAcademyProgramEnrollmentCertificateFileUseCase,
    GetPatientAcademyProgramEnrollmentPaymentRedirectUseCase,
    ListAdminAcademyProgramsUseCase,
    GetAdminAcademyProgramUseCase,
    GetAdminAcademyProgramAttendanceUseCase,
    ListAdminAcademyProgramEnrollmentsUseCase,
    ListPatientAcademyProgramEnrollmentsUseCase,
    GetAdminAcademyProgramEnrollmentUseCase,
    ManageAdminAcademyProgramEnrollmentsUseCase,
    UpdateAdminAcademyProgramEnrollmentLearnerUseCase,
    SaveAdminAcademyProgramAttendanceUseCase,
    UploadAdminAcademyProgramEnrollmentCertificateUseCase,
    CreateAcademyProgramUseCase,
    UpdateAcademyProgramUseCase,
    PublishAcademyProgramUseCase,
    ArchiveAcademyProgramUseCase,
    CreateAcademyProgramSessionUseCase,
    UpdateAcademyProgramSessionUseCase,
  ],
})
export class AcademyModule {}

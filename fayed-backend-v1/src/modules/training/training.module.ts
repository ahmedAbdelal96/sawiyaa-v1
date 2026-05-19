import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PaymentsModule } from '@modules/payments/payments.module';
import { AdminTrainingsController } from './controllers/admin-trainings.controller';
import { PatientTrainingEnrollmentsController } from './controllers/patient-training-enrollments.controller';
import { TrainingPresenter } from './presenters/training.presenter';
import { TrainingRepository } from './repositories/training.repository';
import { BuildTrainingScheduleSnapshotsService } from './services/build-training-schedule-snapshots.service';
import { ResolveTrainingScheduleEnrollmentAvailabilityService } from './services/resolve-training-schedule-enrollment-availability.service';
import { ResolveTrainingJoinAccessService } from './services/resolve-training-join-access.service';
import { ValidateTrainingEnrollmentAttendanceMutationService } from './services/validate-training-enrollment-attendance-mutation.service';
import { ValidateTrainingSchedulePayloadService } from './services/validate-training-schedule-payload.service';
import { ValidateTrainingScheduleStatusTransitionService } from './services/validate-training-schedule-status-transition.service';
import { ValidateTrainingStatusTransitionService } from './services/validate-training-status-transition.service';
import { ArchiveTrainingUseCase } from './use-cases/archive-training.use-case';
import { CreateTrainingEnrollmentUseCase } from './use-cases/create-training-enrollment.use-case';
import { CreateTrainingUseCase } from './use-cases/create-training.use-case';
import { CreateTrainingScheduleUseCase } from './use-cases/create-training-schedule.use-case';
import { CreateTrainingScheduleLectureUseCase } from './use-cases/create-training-schedule-lecture.use-case';
import { GetAdminTrainingUseCase } from './use-cases/get-admin-training.use-case';
import { GetPatientTrainingEnrollmentUseCase } from './use-cases/get-patient-training-enrollment.use-case';
import { ListAdminTrainingSchedulesUseCase } from './use-cases/list-admin-training-schedules.use-case';
import { ListAdminTrainingScheduleEnrollmentsUseCase } from './use-cases/list-admin-training-schedule-enrollments.use-case';
import { ListAdminTrainingScheduleLecturesUseCase } from './use-cases/list-admin-training-schedule-lectures.use-case';
import { ListAdminTrainingPaymentAttemptsUseCase } from './use-cases/list-admin-training-payment-attempts.use-case';
import { ListAdminTrainingsUseCase } from './use-cases/list-admin-trainings.use-case';
import { GetAdminTrainingAnalyticsUseCase } from './use-cases/get-admin-training-analytics.use-case';
import { ListPatientTrainingEnrollmentsUseCase } from './use-cases/list-patient-training-enrollments.use-case';
import { MarkTrainingEnrollmentAttendanceUseCase } from './use-cases/mark-training-enrollment-attendance.use-case';
import { PublishTrainingUseCase } from './use-cases/publish-training.use-case';
import { ResolvePatientTrainingJoinAccessUseCase } from './use-cases/resolve-patient-training-join-access.use-case';
import { UpdateTrainingScheduleUseCase } from './use-cases/update-training-schedule.use-case';
import { UpdateTrainingUseCase } from './use-cases/update-training.use-case';

@Module({
  imports: [PaymentsModule],
  controllers: [AdminTrainingsController, PatientTrainingEnrollmentsController],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    TrainingPresenter,
    TrainingRepository,
    ResolveTrainingScheduleEnrollmentAvailabilityService,
    ResolveTrainingJoinAccessService,
    ValidateTrainingEnrollmentAttendanceMutationService,
    BuildTrainingScheduleSnapshotsService,
    ValidateTrainingSchedulePayloadService,
    ValidateTrainingScheduleStatusTransitionService,
    ValidateTrainingStatusTransitionService,
    CreateTrainingEnrollmentUseCase,
    CreateTrainingUseCase,
    CreateTrainingScheduleUseCase,
    CreateTrainingScheduleLectureUseCase,
    UpdateTrainingUseCase,
    UpdateTrainingScheduleUseCase,
    PublishTrainingUseCase,
    ArchiveTrainingUseCase,
    GetPatientTrainingEnrollmentUseCase,
    ListPatientTrainingEnrollmentsUseCase,
    ResolvePatientTrainingJoinAccessUseCase,
    ListAdminTrainingScheduleEnrollmentsUseCase,
    ListAdminTrainingScheduleLecturesUseCase,
    ListAdminTrainingPaymentAttemptsUseCase,
    GetAdminTrainingAnalyticsUseCase,
    MarkTrainingEnrollmentAttendanceUseCase,
    ListAdminTrainingsUseCase,
    ListAdminTrainingSchedulesUseCase,
    GetAdminTrainingUseCase,
  ],
})
export class TrainingModule {}

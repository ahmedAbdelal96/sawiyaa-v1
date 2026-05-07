import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CreateTrainingDto } from '../dto/create-training.dto';
import { CreateTrainingScheduleDto } from '../dto/create-training-schedule.dto';
import { CreateTrainingScheduleLectureDto } from '../dto/create-training-schedule-lecture.dto';
import { ListAdminTrainingPaymentAttemptsDto } from '../dto/list-admin-training-payment-attempts.dto';
import { ListAdminTrainingScheduleEnrollmentsDto } from '../dto/list-admin-training-schedule-enrollments.dto';
import { ListAdminTrainingsDto } from '../dto/list-admin-trainings.dto';
import { MarkTrainingEnrollmentAttendanceDto } from '../dto/mark-training-enrollment-attendance.dto';
import {
  AdminTrainingAnalyticsSuccessResponseDto,
  AdminTrainingScheduleEnrollmentItemSuccessResponseDto,
  AdminTrainingPaymentAttemptListSuccessResponseDto,
  AdminTrainingScheduleEnrollmentListSuccessResponseDto,
  AdminTrainingScheduleLectureListSuccessResponseDto,
  AdminTrainingItemSuccessResponseDto,
  AdminTrainingListSuccessResponseDto,
  AdminTrainingScheduleLectureItemSuccessResponseDto,
  AdminTrainingScheduleItemSuccessResponseDto,
  AdminTrainingScheduleListSuccessResponseDto,
} from '../dto/training-response.dto';
import { TrainingLocaleQueryDto } from '../dto/training-locale-query.dto';
import { UpdateTrainingScheduleDto } from '../dto/update-training-schedule.dto';
import { UpdateTrainingDto } from '../dto/update-training.dto';
import { ArchiveTrainingUseCase } from '../use-cases/archive-training.use-case';
import { CreateTrainingUseCase } from '../use-cases/create-training.use-case';
import { CreateTrainingScheduleUseCase } from '../use-cases/create-training-schedule.use-case';
import { CreateTrainingScheduleLectureUseCase } from '../use-cases/create-training-schedule-lecture.use-case';
import { GetAdminTrainingUseCase } from '../use-cases/get-admin-training.use-case';
import { ListAdminTrainingSchedulesUseCase } from '../use-cases/list-admin-training-schedules.use-case';
import { ListAdminTrainingScheduleEnrollmentsUseCase } from '../use-cases/list-admin-training-schedule-enrollments.use-case';
import { ListAdminTrainingScheduleLecturesUseCase } from '../use-cases/list-admin-training-schedule-lectures.use-case';
import { ListAdminTrainingPaymentAttemptsUseCase } from '../use-cases/list-admin-training-payment-attempts.use-case';
import { GetAdminTrainingAnalyticsUseCase } from '../use-cases/get-admin-training-analytics.use-case';
import { MarkTrainingEnrollmentAttendanceUseCase } from '../use-cases/mark-training-enrollment-attendance.use-case';
import { ListAdminTrainingsUseCase } from '../use-cases/list-admin-trainings.use-case';
import { PublishTrainingUseCase } from '../use-cases/publish-training.use-case';
import { UpdateTrainingScheduleUseCase } from '../use-cases/update-training-schedule.use-case';
import { UpdateTrainingUseCase } from '../use-cases/update-training.use-case';

@ApiTags('Training')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN)
@Controller('admin/trainings')
export class AdminTrainingsController {
  constructor(
    private readonly createTrainingUseCase: CreateTrainingUseCase,
    private readonly createTrainingScheduleUseCase: CreateTrainingScheduleUseCase,
    private readonly createTrainingScheduleLectureUseCase: CreateTrainingScheduleLectureUseCase,
    private readonly listAdminTrainingsUseCase: ListAdminTrainingsUseCase,
    private readonly listAdminTrainingSchedulesUseCase: ListAdminTrainingSchedulesUseCase,
    private readonly listAdminTrainingScheduleEnrollmentsUseCase: ListAdminTrainingScheduleEnrollmentsUseCase,
    private readonly listAdminTrainingScheduleLecturesUseCase: ListAdminTrainingScheduleLecturesUseCase,
    private readonly listAdminTrainingPaymentAttemptsUseCase: ListAdminTrainingPaymentAttemptsUseCase,
    private readonly getAdminTrainingAnalyticsUseCase: GetAdminTrainingAnalyticsUseCase,
    private readonly getAdminTrainingUseCase: GetAdminTrainingUseCase,
    private readonly updateTrainingUseCase: UpdateTrainingUseCase,
    private readonly updateTrainingScheduleUseCase: UpdateTrainingScheduleUseCase,
    private readonly markTrainingEnrollmentAttendanceUseCase: MarkTrainingEnrollmentAttendanceUseCase,
    private readonly publishTrainingUseCase: PublishTrainingUseCase,
    private readonly archiveTrainingUseCase: ArchiveTrainingUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create training draft (owner/admin)' })
  @ApiBody({ type: CreateTrainingDto })
  @ApiResponse({ status: 201, type: AdminTrainingItemSuccessResponseDto })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateTrainingDto,
  ) {
    return this.createTrainingUseCase
      .execute({ payload: body, createdByUserId: currentUser.id })
      .then((data) => ({ success: true as const, data }));
  }

  @Get()
  @ApiOperation({ summary: 'List trainings for owner/admin management' })
  @ApiResponse({ status: 200, type: AdminTrainingListSuccessResponseDto })
  list(@Query() query: ListAdminTrainingsDto) {
    return this.listAdminTrainingsUseCase
      .execute(query)
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get training details for owner/admin' })
  @ApiResponse({ status: 200, type: AdminTrainingItemSuccessResponseDto })
  getById(
    @Param('id') courseId: string,
    @Query() query: TrainingLocaleQueryDto,
  ) {
    return this.getAdminTrainingUseCase
      .execute({
        courseId,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id/schedules')
  @ApiOperation({ summary: 'List schedules for a training (owner/admin)' })
  @ApiResponse({
    status: 200,
    type: AdminTrainingScheduleListSuccessResponseDto,
  })
  listSchedules(@Param('id') courseId: string) {
    return this.listAdminTrainingSchedulesUseCase
      .execute({ courseId })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id/schedules/:scheduleId/enrollments')
  @ApiOperation({
    summary: 'List enrollments for a training schedule (owner/admin)',
  })
  @ApiResponse({
    status: 200,
    type: AdminTrainingScheduleEnrollmentListSuccessResponseDto,
  })
  listScheduleEnrollments(
    @Param('id') courseId: string,
    @Param('scheduleId') scheduleId: string,
    @Query() query: ListAdminTrainingScheduleEnrollmentsDto,
  ) {
    return this.listAdminTrainingScheduleEnrollmentsUseCase
      .execute({
        courseId,
        scheduleId,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id/schedules/:scheduleId/lectures')
  @ApiOperation({
    summary: 'List lectures for a training schedule (owner/admin)',
  })
  @ApiResponse({
    status: 200,
    type: AdminTrainingScheduleLectureListSuccessResponseDto,
  })
  listScheduleLectures(
    @Param('id') courseId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.listAdminTrainingScheduleLecturesUseCase
      .execute({
        courseId,
        scheduleId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id/payment-attempts')
  @ApiOperation({
    summary: 'List payment attempts for a training (owner/admin)',
  })
  @ApiResponse({
    status: 200,
    type: AdminTrainingPaymentAttemptListSuccessResponseDto,
  })
  listPaymentAttempts(
    @Param('id') courseId: string,
    @Query() query: ListAdminTrainingPaymentAttemptsDto,
  ) {
    return this.listAdminTrainingPaymentAttemptsUseCase
      .execute({
        courseId,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id/analytics')
  @ApiOperation({
    summary: 'Get analytics summary for a training (owner/admin)',
  })
  @ApiResponse({
    status: 200,
    type: AdminTrainingAnalyticsSuccessResponseDto,
  })
  getAnalytics(@Param('id') courseId: string) {
    return this.getAdminTrainingAnalyticsUseCase
      .execute({
        courseId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update training draft/published content' })
  @ApiBody({ type: UpdateTrainingDto })
  @ApiResponse({ status: 200, type: AdminTrainingItemSuccessResponseDto })
  update(@Param('id') courseId: string, @Body() body: UpdateTrainingDto) {
    return this.updateTrainingUseCase
      .execute({
        courseId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/schedules')
  @ApiOperation({ summary: 'Create schedule for training (owner/admin)' })
  @ApiBody({ type: CreateTrainingScheduleDto })
  @ApiResponse({
    status: 201,
    type: AdminTrainingScheduleItemSuccessResponseDto,
  })
  createSchedule(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') courseId: string,
    @Body() body: CreateTrainingScheduleDto,
  ) {
    return this.createTrainingScheduleUseCase
      .execute({
        courseId,
        payload: body,
        createdByUserId: currentUser.id,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/schedules/:scheduleId/lectures')
  @ApiOperation({ summary: 'Create lecture for a training schedule (owner/admin)' })
  @ApiBody({ type: CreateTrainingScheduleLectureDto })
  @ApiResponse({
    status: 201,
    type: AdminTrainingScheduleLectureItemSuccessResponseDto,
  })
  createLecture(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') courseId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() body: CreateTrainingScheduleLectureDto,
  ) {
    return this.createTrainingScheduleLectureUseCase
      .execute({
        courseId,
        scheduleId,
        payload: body,
        createdByUserId: currentUser.id,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id/schedules/:scheduleId')
  @ApiOperation({ summary: 'Update schedule for training (owner/admin)' })
  @ApiBody({ type: UpdateTrainingScheduleDto })
  @ApiResponse({
    status: 200,
    type: AdminTrainingScheduleItemSuccessResponseDto,
  })
  updateSchedule(
    @Param('id') courseId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() body: UpdateTrainingScheduleDto,
  ) {
    return this.updateTrainingScheduleUseCase
      .execute({
        courseId,
        scheduleId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id/enrollments/:enrollmentId/attendance')
  @ApiOperation({
    summary: 'Mark enrollment attendance baseline (owner/admin)',
  })
  @ApiBody({ type: MarkTrainingEnrollmentAttendanceDto })
  @ApiResponse({
    status: 200,
    type: AdminTrainingScheduleEnrollmentItemSuccessResponseDto,
  })
  markEnrollmentAttendance(
    @Param('id') courseId: string,
    @Param('enrollmentId') enrollmentId: string,
    @Body() body: MarkTrainingEnrollmentAttendanceDto,
  ) {
    return this.markTrainingEnrollmentAttendanceUseCase
      .execute({
        courseId,
        enrollmentId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id/publish')
  @ApiOperation({
    summary: 'Publish training (owner/admin, requires at least one schedule)',
  })
  @ApiResponse({ status: 200, type: AdminTrainingItemSuccessResponseDto })
  publish(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') courseId: string,
    @Query() query: TrainingLocaleQueryDto,
  ) {
    return this.publishTrainingUseCase
      .execute({
        courseId,
        query,
        publishedByUserId: currentUser.id,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive training (owner/admin)' })
  @ApiResponse({ status: 200, type: AdminTrainingItemSuccessResponseDto })
  archive(
    @Param('id') courseId: string,
    @Query() query: TrainingLocaleQueryDto,
  ) {
    return this.archiveTrainingUseCase
      .execute({
        courseId,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }
}

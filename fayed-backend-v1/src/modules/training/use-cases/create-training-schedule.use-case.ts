import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CourseScheduleStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateTrainingScheduleDto } from '../dto/create-training-schedule.dto';
import { TrainingRepository } from '../repositories/training.repository';
import { BuildTrainingScheduleSnapshotsService } from '../services/build-training-schedule-snapshots.service';
import { ValidateTrainingSchedulePayloadService } from '../services/validate-training-schedule-payload.service';
import { ValidateTrainingScheduleStatusTransitionService } from '../services/validate-training-schedule-status-transition.service';
import { TRAINING_DEFAULT_TIMEZONE } from '../types/training.types';

@Injectable()
export class CreateTrainingScheduleUseCase {
  private readonly logger = new Logger(CreateTrainingScheduleUseCase.name);

  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly validateTrainingSchedulePayloadService: ValidateTrainingSchedulePayloadService,
    private readonly validateTrainingScheduleStatusTransitionService: ValidateTrainingScheduleStatusTransitionService,
    private readonly buildTrainingScheduleSnapshotsService: BuildTrainingScheduleSnapshotsService,
  ) {}

  async execute(input: {
    courseId: string;
    payload: CreateTrainingScheduleDto;
  }) {
    const course = await this.trainingRepository.findCourseById(input.courseId);
    if (!course) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    const status = input.payload.status ?? CourseScheduleStatus.DRAFT;
    this.validateTrainingScheduleStatusTransitionService.assertCanTransition(
      CourseScheduleStatus.DRAFT,
      status,
    );

    const enrollmentOpenAt = new Date(input.payload.enrollmentOpenAt);
    const enrollmentCloseAt = new Date(input.payload.enrollmentCloseAt);
    const startsAt = new Date(input.payload.startsAt);
    const endsAt = new Date(input.payload.endsAt);

    this.validateTrainingSchedulePayloadService.assertValid({
      enrollmentOpenAt,
      enrollmentCloseAt,
      startsAt,
      endsAt,
      maxEnrollmentsOverride: input.payload.maxEnrollmentsOverride ?? null,
      status,
      externalRoomProvider: input.payload.externalRoomProvider?.trim() ?? null,
      externalRoomJoinUrl: input.payload.externalRoomJoinUrl?.trim() ?? null,
    });

    try {
      const created = await this.trainingRepository.createSchedule(
        input.courseId,
        {
          scheduleCode:
            input.payload.scheduleCode?.trim() ||
            `sch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          status,
          enrollmentOpenAt,
          enrollmentCloseAt,
          startsAt,
          endsAt,
          timezone: input.payload.timezone?.trim() || TRAINING_DEFAULT_TIMEZONE,
          maxEnrollmentsOverride: input.payload.maxEnrollmentsOverride ?? null,
          waitlistEnabled: input.payload.waitlistEnabled ?? false,
          externalRoomProvider:
            input.payload.externalRoomProvider?.trim() || null,
          externalRoomJoinUrl:
            input.payload.externalRoomJoinUrl?.trim() || null,
          externalRoomHostUrl:
            input.payload.externalRoomHostUrl?.trim() || null,
        },
      );

      this.logger.log(
        `Training schedule created (courseId=${input.courseId}, scheduleId=${created.id})`,
      );

      const items = this.buildTrainingScheduleSnapshotsService.build({
        schedules: [created],
        defaultCapacity: course.maxEnrollments ?? null,
        enrollmentCountsByScheduleId: { [created.id]: 0 },
      });

      return {
        item: {
          ...items[0],
          externalRoomProvider: created.externalRoomProvider ?? null,
          externalRoomJoinUrl: created.externalRoomJoinUrl ?? null,
          externalRoomHostUrl: created.externalRoomHostUrl ?? null,
        },
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          messageKey: 'training.errors.scheduleCodeAlreadyExists',
          error: 'TRAINING_SCHEDULE_CODE_ALREADY_EXISTS',
        });
      }
      throw error;
    }
  }
}

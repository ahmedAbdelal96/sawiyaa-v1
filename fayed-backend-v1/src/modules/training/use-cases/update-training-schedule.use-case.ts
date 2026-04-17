import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UpdateTrainingScheduleDto } from '../dto/update-training-schedule.dto';
import { TrainingRepository } from '../repositories/training.repository';
import { BuildTrainingScheduleSnapshotsService } from '../services/build-training-schedule-snapshots.service';
import { ValidateTrainingSchedulePayloadService } from '../services/validate-training-schedule-payload.service';
import { ValidateTrainingScheduleStatusTransitionService } from '../services/validate-training-schedule-status-transition.service';

@Injectable()
export class UpdateTrainingScheduleUseCase {
  private readonly logger = new Logger(UpdateTrainingScheduleUseCase.name);

  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly validateTrainingSchedulePayloadService: ValidateTrainingSchedulePayloadService,
    private readonly validateTrainingScheduleStatusTransitionService: ValidateTrainingScheduleStatusTransitionService,
    private readonly buildTrainingScheduleSnapshotsService: BuildTrainingScheduleSnapshotsService,
  ) {}

  async execute(input: {
    courseId: string;
    scheduleId: string;
    payload: UpdateTrainingScheduleDto;
  }) {
    const course = await this.trainingRepository.findCourseById(input.courseId);
    if (!course) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    const schedule = await this.trainingRepository.findScheduleById(input.scheduleId);
    if (!schedule || schedule.courseId !== input.courseId) {
      throw new NotFoundException({
        messageKey: 'training.errors.scheduleNotFound',
        error: 'TRAINING_SCHEDULE_NOT_FOUND',
      });
    }

    const nextStatus = input.payload.status ?? schedule.status;
    this.validateTrainingScheduleStatusTransitionService.assertCanTransition(
      schedule.status,
      nextStatus,
    );

    const enrollmentOpenAt =
      input.payload.enrollmentOpenAt !== undefined
        ? new Date(input.payload.enrollmentOpenAt)
        : schedule.enrollmentOpenAt;
    const enrollmentCloseAt =
      input.payload.enrollmentCloseAt !== undefined
        ? new Date(input.payload.enrollmentCloseAt)
        : schedule.enrollmentCloseAt;
    const startsAt =
      input.payload.startsAt !== undefined
        ? new Date(input.payload.startsAt)
        : schedule.startsAt;
    const endsAt =
      input.payload.endsAt !== undefined ? new Date(input.payload.endsAt) : schedule.endsAt;
    const maxEnrollmentsOverride =
      input.payload.maxEnrollmentsOverride !== undefined
        ? input.payload.maxEnrollmentsOverride
        : schedule.maxEnrollmentsOverride;

    this.validateTrainingSchedulePayloadService.assertValid({
      enrollmentOpenAt,
      enrollmentCloseAt,
      startsAt,
      endsAt,
      maxEnrollmentsOverride,
      status: nextStatus,
      externalRoomProvider:
        input.payload.externalRoomProvider !== undefined
          ? input.payload.externalRoomProvider?.trim() ?? null
          : schedule.externalRoomProvider,
      externalRoomJoinUrl:
        input.payload.externalRoomJoinUrl !== undefined
          ? input.payload.externalRoomJoinUrl?.trim() ?? null
          : schedule.externalRoomJoinUrl,
    });

    const occupiedMap = await this.trainingRepository.countEnrollmentsByScheduleIds([
      input.scheduleId,
    ]);
    const occupiedSeats = occupiedMap[input.scheduleId] ?? 0;
    const maxSeats = maxEnrollmentsOverride ?? course.maxEnrollments ?? null;
    if (maxSeats !== null && maxSeats < occupiedSeats) {
      throw new BadRequestException({
        messageKey: 'training.errors.capacityBelowCurrentEnrollments',
        error: 'TRAINING_CAPACITY_BELOW_CURRENT_ENROLLMENTS',
      });
    }

    try {
      const updated = await this.trainingRepository.updateSchedule(input.scheduleId, {
        ...(input.payload.scheduleCode !== undefined
          ? { scheduleCode: input.payload.scheduleCode?.trim() || undefined }
          : {}),
        ...(input.payload.status !== undefined ? { status: input.payload.status } : {}),
        ...(input.payload.enrollmentOpenAt !== undefined ? { enrollmentOpenAt } : {}),
        ...(input.payload.enrollmentCloseAt !== undefined
          ? { enrollmentCloseAt }
          : {}),
        ...(input.payload.startsAt !== undefined ? { startsAt } : {}),
        ...(input.payload.endsAt !== undefined ? { endsAt } : {}),
        ...(input.payload.timezone !== undefined
          ? { timezone: input.payload.timezone?.trim() || null }
          : {}),
        ...(input.payload.maxEnrollmentsOverride !== undefined
          ? { maxEnrollmentsOverride }
          : {}),
        ...(input.payload.waitlistEnabled !== undefined
          ? { waitlistEnabled: input.payload.waitlistEnabled }
          : {}),
        ...(input.payload.externalRoomProvider !== undefined
          ? { externalRoomProvider: input.payload.externalRoomProvider?.trim() || null }
          : {}),
        ...(input.payload.externalRoomJoinUrl !== undefined
          ? { externalRoomJoinUrl: input.payload.externalRoomJoinUrl?.trim() || null }
          : {}),
        ...(input.payload.externalRoomHostUrl !== undefined
          ? { externalRoomHostUrl: input.payload.externalRoomHostUrl?.trim() || null }
          : {}),
      });

      this.logger.log(
        `Training schedule updated (courseId=${input.courseId}, scheduleId=${input.scheduleId})`,
      );

      const items = this.buildTrainingScheduleSnapshotsService.build({
        schedules: [updated],
        defaultCapacity: course.maxEnrollments ?? null,
        enrollmentCountsByScheduleId: { [updated.id]: occupiedSeats },
      });

      return {
        item: {
          ...items[0],
          externalRoomProvider: updated.externalRoomProvider ?? null,
          externalRoomJoinUrl: updated.externalRoomJoinUrl ?? null,
          externalRoomHostUrl: updated.externalRoomHostUrl ?? null,
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

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, CourseVisibility, Prisma } from '@prisma/client';
import { TrainingLocaleQueryDto } from '../dto/training-locale-query.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ValidateTrainingStatusTransitionService } from '../services/validate-training-status-transition.service';
import { TRAINING_DEFAULT_LOCALE } from '../types/training.types';

@Injectable()
export class PublishTrainingUseCase {
  private readonly logger = new Logger(PublishTrainingUseCase.name);

  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly validateTrainingStatusTransitionService: ValidateTrainingStatusTransitionService,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: {
    courseId: string;
    query: TrainingLocaleQueryDto;
    publishedByUserId?: string | null;
  }) {
    const existing = await this.trainingRepository.findCourseById(
      input.courseId,
    );
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    this.validateTrainingStatusTransitionService.assertCanPublish(
      existing.status,
    );

    const scheduleCount = await this.trainingRepository.countSchedulesByCourseId(
      input.courseId,
    );

    if (scheduleCount === 0) {
      throw new BadRequestException({
        messageKey: 'training.errors.scheduleRequiredForPublish',
        error: 'TRAINING_SCHEDULE_REQUIRED_FOR_PUBLISH',
      });
    }

    const schedules = existing.schedules ?? [];
    const lectureCountsByScheduleId =
      await this.trainingRepository.countSessionsByScheduleIds(
        schedules.map((schedule) => schedule.id),
      );

    for (const schedule of schedules) {
      if (
        schedule.plannedDurationDays === null ||
        schedule.plannedDurationDays === undefined ||
        schedule.plannedLectureCount === null ||
        schedule.plannedLectureCount === undefined
      ) {
        throw new BadRequestException({
          messageKey: 'training.errors.trainingPlanRequiredForPublish',
          error: 'TRAINING_TRAINING_PLAN_REQUIRED_FOR_PUBLISH',
          messageParams: {
            scheduleCode: schedule.scheduleCode,
          },
        });
      }

      const lectureCount = lectureCountsByScheduleId[schedule.id] ?? 0;
      if (lectureCount < schedule.plannedLectureCount) {
        throw new BadRequestException({
          messageKey: 'training.errors.trainingPlanIncompleteForPublish',
          error: 'TRAINING_TRAINING_PLAN_INCOMPLETE_FOR_PUBLISH',
          messageParams: {
            scheduleCode: schedule.scheduleCode,
            plannedLectureCount: schedule.plannedLectureCount,
            lectureCount,
          },
        });
      }
    }

    const now = new Date();
    const data: Prisma.CourseUncheckedUpdateInput = {
      status: CourseStatus.PUBLISHED,
      archivedAt: null,
      publishedAt: now,
      publishedByUserId: input.publishedByUserId ?? null,
    };

    if (existing.visibility === CourseVisibility.PRIVATE) {
      data.visibility = CourseVisibility.PUBLIC;
    }

    const updated = await this.trainingRepository.updateCourse(
      input.courseId,
      data,
    );

    this.logger.log(`Training published (id=${input.courseId})`);

    return {
      item: this.trainingPresenter.presentAdminTrainingItem(
        updated,
        input.query.locale ?? TRAINING_DEFAULT_LOCALE,
      ),
    };
  }
}

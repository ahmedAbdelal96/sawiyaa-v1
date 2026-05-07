import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTrainingScheduleLectureDto } from '../dto/create-training-schedule-lecture.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';

@Injectable()
export class CreateTrainingScheduleLectureUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: {
    courseId: string;
    scheduleId: string;
    createdByUserId?: string | null;
    payload: CreateTrainingScheduleLectureDto;
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

    const startsAt = new Date(input.payload.startsAt);
    const endsAt = new Date(input.payload.endsAt);
    if (!(startsAt < endsAt)) {
      throw new BadRequestException({
        messageKey: 'training.errors.invalidSessionWindow',
        error: 'TRAINING_INVALID_SESSION_WINDOW',
      });
    }

    const created = await this.trainingRepository.createSessionForSchedule(
      input.scheduleId,
      {
        sessionOrder: input.payload.sessionOrder,
        sessionTitle: input.payload.sessionTitle?.trim() || null,
        startsAt,
        endsAt,
        externalRoomProvider: input.payload.externalRoomProvider?.trim() || null,
        externalRoomJoinUrl: input.payload.externalRoomJoinUrl?.trim() || null,
        externalRoomHostUrl: input.payload.externalRoomHostUrl?.trim() || null,
        attendanceTrackingEnabled:
          input.payload.attendanceTrackingEnabled ?? true,
        isMandatory: input.payload.isMandatory ?? true,
        createdByUserId: input.createdByUserId ?? null,
      },
    );

    return {
      item: this.trainingPresenter.presentAdminScheduleLectureItem(created),
    };
  }
}

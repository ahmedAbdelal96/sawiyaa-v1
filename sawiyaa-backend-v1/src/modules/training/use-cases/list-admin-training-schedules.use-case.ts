import { Injectable, NotFoundException } from '@nestjs/common';
import { TrainingRepository } from '../repositories/training.repository';
import { BuildTrainingScheduleSnapshotsService } from '../services/build-training-schedule-snapshots.service';

@Injectable()
export class ListAdminTrainingSchedulesUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly buildTrainingScheduleSnapshotsService: BuildTrainingScheduleSnapshotsService,
  ) {}

  async execute(input: { courseId: string }) {
    const course = await this.trainingRepository.findCourseById(input.courseId);
    if (!course) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    const schedules = await this.trainingRepository.listCourseSchedulesForAdmin(
      input.courseId,
    );
    const enrollmentCountsByScheduleId =
      await this.trainingRepository.countEnrollmentsByScheduleIds(
        schedules.map((schedule) => schedule.id),
      );
    const lectureCountsByScheduleId =
      await this.trainingRepository.countSessionsByScheduleIds(
        schedules.map((schedule) => schedule.id),
      );

    const snapshots = this.buildTrainingScheduleSnapshotsService.build({
      schedules,
      defaultCapacity: course.maxEnrollments ?? null,
      enrollmentCountsByScheduleId,
      lectureCountsByScheduleId,
    });

    return {
      items: snapshots.map((snapshot) => {
        const schedule = schedules.find((item) => item.id === snapshot.id);
        return {
          ...snapshot,
          externalRoomProvider: schedule?.externalRoomProvider ?? null,
          externalRoomJoinUrl: schedule?.externalRoomJoinUrl ?? null,
          externalRoomHostUrl: schedule?.externalRoomHostUrl ?? null,
        };
      }),
    };
  }
}

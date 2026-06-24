import { Injectable } from '@nestjs/common';
import { ListAdminTrainingsDto } from '../dto/list-admin-trainings.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';

@Injectable()
export class ListAdminTrainingsUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(query: ListAdminTrainingsDto) {
    const [
      items,
      totalItems,
      draftCount,
      publishedCount,
      archivedCount,
      openForEnrollmentCount,
      closedForEnrollmentCount,
    ] = await this.trainingRepository.listAdminCourses({
      page: query.page,
      limit: query.limit,
      locale: query.locale,
      status: query.status,
      q: query.q?.trim() || undefined,
    });

    return {
      items: items
        .map((item) =>
          this.trainingPresenter.presentAdminTrainingItem(item, query.locale),
        )
        .filter((item): item is NonNullable<typeof item> => item !== null),
      pagination: this.trainingPresenter.presentPagination({
        page: query.page,
        limit: query.limit,
        totalItems,
      }),
      summary: {
        total: totalItems,
        draft: draftCount,
        published: publishedCount,
        archived: archivedCount,
        openForEnrollment: openForEnrollmentCount,
        closedForEnrollment: closedForEnrollmentCount,
      },
    };
  }
}

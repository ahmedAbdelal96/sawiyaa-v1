import { Injectable } from '@nestjs/common';
import { ListPublicTrainingsDto } from '../dto/list-public-trainings.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';

@Injectable()
export class ListPublicTrainingsUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(query: ListPublicTrainingsDto) {
    const [items, totalItems] = await this.trainingRepository.listPublicCourses(
      {
        page: query.page,
        limit: query.limit,
        locale: query.locale,
        q: query.q?.trim() || undefined,
      },
    );

    return {
      items: items
        .map((item) =>
          this.trainingPresenter.presentPublicTrainingItem(item, query.locale),
        )
        .filter((item): item is NonNullable<typeof item> => item !== null),
      pagination: this.trainingPresenter.presentPagination({
        page: query.page,
        limit: query.limit,
        totalItems,
      }),
    };
  }
}

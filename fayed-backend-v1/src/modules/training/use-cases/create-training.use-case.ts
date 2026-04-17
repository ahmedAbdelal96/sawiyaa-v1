import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { CourseStatus, CourseVisibility } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateTrainingDto } from '../dto/create-training.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';

@Injectable()
export class CreateTrainingUseCase {
  private readonly logger = new Logger(CreateTrainingUseCase.name);

  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: { payload: CreateTrainingDto }) {
    const payload = input.payload;

    try {
      const created = await this.trainingRepository.createCourse({
        slugRoot: payload.slug.trim().toLowerCase(),
        courseType: payload.courseType,
        status: CourseStatus.DRAFT,
        visibility: payload.visibility ?? CourseVisibility.PUBLIC,
        coverImageUrl: payload.coverImageUrl?.trim() || null,
        thumbnailUrl: payload.thumbnailUrl?.trim() || null,
        translations: {
          create: {
            locale: payload.locale,
            title: payload.title.trim(),
            slug: payload.slug.trim().toLowerCase(),
            shortDescription: payload.shortDescription?.trim() || null,
            fullDescription: payload.fullDescription?.trim() || null,
            metaTitle: payload.metaTitle?.trim() || null,
            metaDescription: payload.metaDescription?.trim() || null,
          },
        },
      });

      this.logger.log(`Training created as draft (id=${created.id})`);

      return {
        item: this.trainingPresenter.presentAdminTrainingItem(
          created,
          payload.locale,
        ),
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          messageKey: 'training.errors.slugAlreadyExists',
          error: 'TRAINING_SLUG_ALREADY_EXISTS',
        });
      }
      throw error;
    }
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ContentLocale, CourseStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UpdateTrainingDto } from '../dto/update-training.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { TRAINING_DEFAULT_LOCALE } from '../types/training.types';

@Injectable()
export class UpdateTrainingUseCase {
  private readonly logger = new Logger(UpdateTrainingUseCase.name);

  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: { courseId: string; payload: UpdateTrainingDto }) {
    const existing = await this.trainingRepository.findCourseById(input.courseId);
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'training.errors.notFound',
        error: 'TRAINING_NOT_FOUND',
      });
    }

    if (existing.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException({
        messageKey: 'training.errors.archivedReadOnly',
        error: 'TRAINING_ARCHIVED_READ_ONLY',
      });
    }

    const hasTranslationFieldPatch = this.hasTranslationFieldPatch(input.payload);
    if (hasTranslationFieldPatch && !input.payload.locale) {
      throw new BadRequestException({
        messageKey: 'training.errors.localeRequiredForTranslationUpdate',
        error: 'TRAINING_LOCALE_REQUIRED_FOR_TRANSLATION_UPDATE',
      });
    }

    const locale = this.resolveLocale(existing, input.payload.locale);

    try {
      if (
        input.payload.courseType !== undefined ||
        input.payload.visibility !== undefined ||
        input.payload.coverImageUrl !== undefined ||
        input.payload.thumbnailUrl !== undefined
      ) {
        await this.trainingRepository.updateCourse(input.courseId, {
          ...(input.payload.courseType !== undefined
            ? { courseType: input.payload.courseType }
            : {}),
          ...(input.payload.visibility !== undefined
            ? { visibility: input.payload.visibility }
            : {}),
          ...(input.payload.coverImageUrl !== undefined
            ? { coverImageUrl: input.payload.coverImageUrl?.trim() || null }
            : {}),
          ...(input.payload.thumbnailUrl !== undefined
            ? { thumbnailUrl: input.payload.thumbnailUrl?.trim() || null }
            : {}),
        });
      }

      if (hasTranslationFieldPatch) {
        await this.trainingRepository.upsertCourseTranslation({
          courseId: input.courseId,
          locale,
          ...(input.payload.title !== undefined
            ? { title: input.payload.title.trim() }
            : {}),
          ...(input.payload.slug !== undefined
            ? { slug: input.payload.slug.trim().toLowerCase() }
            : {}),
          ...(input.payload.shortDescription !== undefined
            ? { shortDescription: input.payload.shortDescription?.trim() || null }
            : {}),
          ...(input.payload.fullDescription !== undefined
            ? { fullDescription: input.payload.fullDescription?.trim() || null }
            : {}),
          ...(input.payload.metaTitle !== undefined
            ? { metaTitle: input.payload.metaTitle?.trim() || null }
            : {}),
          ...(input.payload.metaDescription !== undefined
            ? { metaDescription: input.payload.metaDescription?.trim() || null }
            : {}),
        });
      }

      if (input.payload.slug !== undefined) {
        await this.trainingRepository.updateCourse(input.courseId, {
          slugRoot: input.payload.slug.trim().toLowerCase(),
        });
      }

      const refreshed = await this.trainingRepository.findCourseById(input.courseId);
      if (!refreshed) {
        throw new NotFoundException({
          messageKey: 'training.errors.notFound',
          error: 'TRAINING_NOT_FOUND',
        });
      }

      this.logger.log(`Training updated (id=${input.courseId})`);

      return {
        item: this.trainingPresenter.presentAdminTrainingItem(refreshed, locale),
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

  private hasTranslationFieldPatch(payload: UpdateTrainingDto): boolean {
    return (
      payload.title !== undefined ||
      payload.slug !== undefined ||
      payload.shortDescription !== undefined ||
      payload.fullDescription !== undefined ||
      payload.metaTitle !== undefined ||
      payload.metaDescription !== undefined
    );
  }

  private resolveLocale(
    course: {
      translations: Array<{
        locale: string;
      }>;
    },
    payloadLocale?: ContentLocale,
  ): ContentLocale {
    if (payloadLocale) {
      return payloadLocale;
    }

    if (course.translations.some((translation) => translation.locale === TRAINING_DEFAULT_LOCALE)) {
      return TRAINING_DEFAULT_LOCALE;
    }

    if (course.translations.some((translation) => translation.locale === ContentLocale.en)) {
      return ContentLocale.en;
    }

    return TRAINING_DEFAULT_LOCALE;
  }
}

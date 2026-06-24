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

  async execute(input: {
    payload: CreateTrainingDto;
    createdByUserId?: string | null;
  }) {
    const payload = input.payload;
    const slugRoot = await this.resolveUniqueSlugRoot(payload.title);

    try {
      const created = await this.trainingRepository.createCourse({
        slugRoot,
        courseType: payload.courseType,
        createdByUserId: input.createdByUserId ?? null,
        status: CourseStatus.DRAFT,
        visibility: payload.visibility ?? CourseVisibility.PUBLIC,
        coverImageUrl: payload.coverImageUrl?.trim() || null,
        thumbnailUrl: payload.thumbnailUrl?.trim() || null,
        translations: {
          create: {
            locale: payload.locale,
            title: payload.title.trim(),
            slug: slugRoot,
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

  private async resolveUniqueSlugRoot(title: string): Promise<string> {
    const base = this.slugifyTitle(title);
    let candidate = base;
    let suffix = 2;

    while (await this.trainingRepository.findCourseBySlugRoot(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private slugifyTitle(title: string): string {
    const normalized = title.trim().toLowerCase().normalize('NFKD');
    const transliterated = normalized
      .split('')
      .map((character) => this.transliterateCharacter(character))
      .join('');

    const slug = transliterated
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'training-item';
  }

  private transliterateCharacter(character: string): string {
    const map: Record<string, string> = {
      أ: 'a',
      ء: '',
      ئ: 'y',
      ا: 'a',
      ب: 'b',
      ت: 't',
      ث: 'th',
      ج: 'j',
      ح: 'h',
      خ: 'kh',
      د: 'd',
      ذ: 'dh',
      ر: 'r',
      ز: 'z',
      س: 's',
      ش: 'sh',
      ص: 's',
      ض: 'd',
      ط: 't',
      ظ: 'z',
      ع: 'a',
      غ: 'gh',
      ف: 'f',
      ق: 'q',
      ك: 'k',
      ل: 'l',
      م: 'm',
      ن: 'n',
      ه: 'h',
      و: 'w',
      ي: 'y',
      ى: 'a',
      ة: 'h',
      ؤ: 'w',
      إ: 'i',
      آ: 'a',
      ' ': '-',
      '‌': '',
      '‍': '',
    };

    if (map[character] !== undefined) {
      return map[character];
    }

    return character;
  }
}

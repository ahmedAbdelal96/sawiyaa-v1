import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademyProgramStatus } from '@prisma/client';
import { CreateAcademyProgramDto } from '../dto/create-academy-program.dto';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';
import {
  ensureAcademyProgramWindowIsValid,
  ensureAcademyProgramRequiredFields,
  normalizeAcademyProgramPriceValue,
  parseAcademyProgramDate,
  resolveAcademyProgramSlugSource,
} from '../utils/academy-program.util';

@Injectable()
export class CreateAcademyProgramUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
  ) {}

  async execute(input: {
    createdByUserId: string;
    payload: CreateAcademyProgramDto;
  }) {
    const payload = input.payload;
    const categoryId = payload.categoryId?.trim() || null;
    if (categoryId) {
      const category = await this.academyProgramRepository.findCategoryById(
        categoryId,
      );
      if (!category) {
        throw new NotFoundException({
          messageKey: 'academyProgram.errors.categoryNotFound',
          error: 'ACADEMY_PROGRAM_CATEGORY_NOT_FOUND',
        });
      }
    }

    const startAt = parseAcademyProgramDate(payload.startAt ?? null);
    const endAt = parseAcademyProgramDate(payload.endAt ?? null);
    ensureAcademyProgramRequiredFields({
      titleAr: payload.titleAr,
      titleEn: payload.titleEn,
      descriptionAr: payload.descriptionAr,
      descriptionEn: payload.descriptionEn,
      priceEgp: payload.priceEgp,
      priceUsd: payload.priceUsd,
      startAt,
      endAt,
    });
    ensureAcademyProgramWindowIsValid({ startAt, endAt });

    const slugBase = resolveAcademyProgramSlugSource({
      slug: payload.slug ?? null,
      titleAr: payload.titleAr,
      titleEn: payload.titleEn,
    });
    const slug = await this.resolveUniqueSlug(slugBase);

    const priceEgp = normalizeAcademyProgramPriceValue(payload.priceEgp);
    const priceUsd = normalizeAcademyProgramPriceValue(payload.priceUsd);

    const created = await this.academyProgramRepository.createProgram({
      slug,
      titleAr: payload.titleAr.trim(),
      titleEn: payload.titleEn.trim(),
      descriptionAr: payload.descriptionAr?.trim() || null,
      descriptionEn: payload.descriptionEn?.trim() || null,
      coverImageUrl: payload.coverImageUrl?.trim() || null,
      categoryId,
      priceEgp,
      priceUsd,
      registrationOpen: payload.registrationOpen ?? true,
      maxSeats: payload.maxSeats ?? null,
      startAt,
      endAt,
      status: AcademyProgramStatus.DRAFT,
      createdByUserId: input.createdByUserId,
      publishedAt: null,
      archivedAt: null,
    });

    return {
      item: this.academyProgramPresenter.presentAdminProgramDetails(created),
    };
  }

  private async resolveUniqueSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 2;

    while (await this.academyProgramRepository.findProgramBySlug(candidate)) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}

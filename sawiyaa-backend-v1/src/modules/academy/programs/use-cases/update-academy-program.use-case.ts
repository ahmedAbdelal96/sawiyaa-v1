import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateAcademyProgramDto } from '../dto/update-academy-program.dto';
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
export class UpdateAcademyProgramUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
  ) {}

  async execute(input: {
    programId: string;
    payload: UpdateAcademyProgramDto;
  }) {
    const existing = await this.academyProgramRepository.findProgramById(
      input.programId,
    );
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    const categoryId =
      input.payload.categoryId !== undefined
        ? input.payload.categoryId.trim() || null
        : undefined;
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

    const startAt =
      input.payload.startAt !== undefined
        ? parseAcademyProgramDate(input.payload.startAt)
        : existing.startAt;
    const endAt =
      input.payload.endAt !== undefined
        ? parseAcademyProgramDate(input.payload.endAt)
        : existing.endAt;
    const titleAr =
      input.payload.titleAr !== undefined ? input.payload.titleAr : existing.titleAr;
    const titleEn =
      input.payload.titleEn !== undefined ? input.payload.titleEn : existing.titleEn;
    const descriptionAr =
      input.payload.descriptionAr !== undefined
        ? input.payload.descriptionAr
        : existing.descriptionAr;
    const descriptionEn =
      input.payload.descriptionEn !== undefined
        ? input.payload.descriptionEn
        : existing.descriptionEn;
    const priceEgpRaw =
      input.payload.priceEgp !== undefined
        ? input.payload.priceEgp
        : existing.priceEgp?.toString() ?? null;
    const priceUsdRaw =
      input.payload.priceUsd !== undefined
        ? input.payload.priceUsd
        : existing.priceUsd?.toString() ?? null;
    ensureAcademyProgramRequiredFields({
      titleAr,
      titleEn,
      descriptionAr,
      descriptionEn,
      priceEgp: priceEgpRaw,
      priceUsd: priceUsdRaw,
      startAt,
      endAt,
    });
    ensureAcademyProgramWindowIsValid({ startAt, endAt });

    const slug =
      input.payload.slug !== undefined
        ? await this.resolveUniqueSlug(
            resolveAcademyProgramSlugSource({
              slug: input.payload.slug,
              titleAr,
              titleEn,
            }),
            existing.id,
          )
        : undefined;

    const priceEgp =
      input.payload.priceEgp !== undefined
        ? normalizeAcademyProgramPriceValue(input.payload.priceEgp)
        : existing.priceEgp?.toString() ?? null;
    const priceUsd =
      input.payload.priceUsd !== undefined
        ? normalizeAcademyProgramPriceValue(input.payload.priceUsd)
        : existing.priceUsd?.toString() ?? null;

    const updated = await this.academyProgramRepository.updateProgram(
      input.programId,
      {
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim(),
        descriptionAr: descriptionAr?.trim() || null,
        descriptionEn: descriptionEn?.trim() || null,
        slug,
        coverImageUrl:
          input.payload.coverImageUrl !== undefined
            ? input.payload.coverImageUrl.trim() || null
            : undefined,
        categoryId,
        priceEgp,
        priceUsd,
        registrationOpen: input.payload.registrationOpen,
        maxSeats:
          input.payload.maxSeats !== undefined ? input.payload.maxSeats : undefined,
        startAt,
        endAt,
      },
    );

    return {
      item: this.academyProgramPresenter.presentAdminProgramDetails(updated),
    };
  }

  private async resolveUniqueSlug(baseSlug: string, programId?: string) {
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.academyProgramRepository.findProgramBySlug(
        candidate,
      );

      if (!existing || existing.id === programId) {
        return candidate;
      }

      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }
}

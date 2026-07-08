import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AcademyProgramStatus } from '@prisma/client';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';
import {
  ensureAcademyProgramRequiredFields,
  ensureAcademyProgramWindowIsValid,
} from '../utils/academy-program.util';

@Injectable()
export class PublishAcademyProgramUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
  ) {}

  async execute(input: { programId: string }) {
    const existing = await this.academyProgramRepository.findProgramById(
      input.programId,
    );
    if (!existing) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    if (existing.status === AcademyProgramStatus.ARCHIVED) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.archivedProgramCannotBePublished',
        error: 'ACADEMY_PROGRAM_ARCHIVED_CANNOT_BE_PUBLISHED',
      });
    }

    ensureAcademyProgramRequiredFields({
      titleAr: existing.titleAr,
      titleEn: existing.titleEn,
      descriptionAr: existing.descriptionAr,
      descriptionEn: existing.descriptionEn,
      priceEgp: existing.priceEgp?.toString() ?? null,
      priceUsd: existing.priceUsd?.toString() ?? null,
      startAt: existing.startAt,
      endAt: existing.endAt,
    });
    ensureAcademyProgramWindowIsValid({
      startAt: existing.startAt,
      endAt: existing.endAt,
    });

    const updated = await this.academyProgramRepository.updateProgram(
      input.programId,
      {
        status: AcademyProgramStatus.PUBLISHED,
        publishedAt: existing.publishedAt ?? new Date(),
        archivedAt: null,
      },
    );

    return {
      item: this.academyProgramPresenter.presentAdminProgramDetails(updated),
    };
  }
}

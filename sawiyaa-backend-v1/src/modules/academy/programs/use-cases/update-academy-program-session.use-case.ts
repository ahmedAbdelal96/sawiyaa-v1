import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateAcademyProgramSessionDto } from '../dto/update-academy-program-session.dto';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';
import {
  ensureAcademyProgramWindowIsValid,
  parseAcademyProgramDate,
} from '../utils/academy-program.util';

@Injectable()
export class UpdateAcademyProgramSessionUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
  ) {}

  async execute(input: {
    programId: string;
    sessionId: string;
    payload: UpdateAcademyProgramSessionDto;
  }) {
    const existing = await this.academyProgramRepository.findSessionByProgramAndId(
      input.programId,
      input.sessionId,
    );

    if (!existing) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.sessionNotFound',
        error: 'ACADEMY_PROGRAM_SESSION_NOT_FOUND',
      });
    }

    const startsAt =
      input.payload.startsAt !== undefined
        ? (parseAcademyProgramDate(input.payload.startsAt) as Date)
        : existing.startsAt;
    const endsAt =
      input.payload.endsAt !== undefined
        ? (parseAcademyProgramDate(input.payload.endsAt) as Date)
        : existing.endsAt;
    ensureAcademyProgramWindowIsValid({ startAt: startsAt, endAt: endsAt });

    const isPublished =
      input.payload.isPublished !== undefined
        ? input.payload.isPublished
        : existing.isPublished;

    const updated = await this.academyProgramRepository.updateSession(
      input.sessionId,
      {
        titleAr:
          input.payload.titleAr !== undefined
            ? input.payload.titleAr.trim()
            : undefined,
        titleEn:
          input.payload.titleEn !== undefined
            ? input.payload.titleEn.trim()
            : undefined,
        descriptionAr:
          input.payload.descriptionAr !== undefined
            ? input.payload.descriptionAr.trim() || null
            : undefined,
        descriptionEn:
          input.payload.descriptionEn !== undefined
            ? input.payload.descriptionEn.trim() || null
            : undefined,
        startsAt,
        endsAt,
        deliveryMethod: input.payload.deliveryMethod,
        internalDeliveryNote:
          input.payload.internalDeliveryNote !== undefined
            ? input.payload.internalDeliveryNote.trim() || null
            : undefined,
        internalDeliveryLink:
          input.payload.internalDeliveryLink !== undefined
            ? input.payload.internalDeliveryLink.trim() || null
            : undefined,
        sortOrder:
          input.payload.sortOrder !== undefined
            ? input.payload.sortOrder
            : undefined,
        isPublished,
        publishedAt: isPublished ? existing.publishedAt ?? new Date() : null,
      },
    );

    return {
      item: this.academyProgramPresenter.presentAdminSessionItem(updated),
    };
  }
}

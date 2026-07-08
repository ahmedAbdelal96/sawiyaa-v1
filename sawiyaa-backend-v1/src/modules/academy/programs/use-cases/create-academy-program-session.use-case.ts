import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAcademyProgramSessionDto } from '../dto/create-academy-program-session.dto';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';
import {
  ensureAcademyProgramWindowIsValid,
  parseAcademyProgramDate,
} from '../utils/academy-program.util';

@Injectable()
export class CreateAcademyProgramSessionUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
  ) {}

  async execute(input: {
    programId: string;
    createdByUserId: string;
    payload: CreateAcademyProgramSessionDto;
  }) {
    const program = await this.academyProgramRepository.findProgramById(
      input.programId,
    );
    if (!program) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    const startsAt = parseAcademyProgramDate(input.payload.startsAt) as Date;
    const endsAt = parseAcademyProgramDate(input.payload.endsAt) as Date;
    ensureAcademyProgramWindowIsValid({ startAt: startsAt, endAt: endsAt });

    const created = await this.academyProgramRepository.createSession({
      academyProgramId: input.programId,
      titleAr: input.payload.titleAr.trim(),
      titleEn: input.payload.titleEn.trim(),
      descriptionAr: input.payload.descriptionAr?.trim() || null,
      descriptionEn: input.payload.descriptionEn?.trim() || null,
      startsAt,
      endsAt,
      deliveryMethod: input.payload.deliveryMethod,
      internalDeliveryNote: input.payload.internalDeliveryNote?.trim() || null,
      internalDeliveryLink: input.payload.internalDeliveryLink?.trim() || null,
      sortOrder: input.payload.sortOrder ?? 0,
      isPublished: input.payload.isPublished ?? false,
      publishedAt: input.payload.isPublished ? new Date() : null,
      createdByUserId: input.createdByUserId,
    });

    return {
      item: this.academyProgramPresenter.presentAdminSessionItem(created),
    };
  }
}

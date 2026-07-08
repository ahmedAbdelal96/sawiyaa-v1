import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademyProgramStatus } from '@prisma/client';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';

@Injectable()
export class ArchiveAcademyProgramUseCase {
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

    const updated = await this.academyProgramRepository.updateProgram(
      input.programId,
      {
        status: AcademyProgramStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    );

    return {
      item: this.academyProgramPresenter.presentAdminProgramDetails(updated),
    };
  }
}

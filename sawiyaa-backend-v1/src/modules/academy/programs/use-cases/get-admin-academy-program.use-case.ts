import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';

@Injectable()
export class GetAdminAcademyProgramUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
  ) {}

  async execute(input: { programId: string }) {
    const program = await this.academyProgramRepository.findProgramById(
      input.programId,
    );

    if (!program) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    return {
      item: this.academyProgramPresenter.presentAdminProgramDetails(program),
    };
  }
}

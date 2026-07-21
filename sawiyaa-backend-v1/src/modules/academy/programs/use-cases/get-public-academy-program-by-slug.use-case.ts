import { Injectable, NotFoundException } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';

@Injectable()
export class GetPublicAcademyProgramBySlugUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
  ) {}

  async execute(input: {
    slug: string;
    locale: SupportedLocale;
    requestCountryIsoCode: string | null;
  }) {
    const program = await this.academyProgramRepository.findPublicProgramBySlug(
      input.slug,
    );

    if (!program) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    return {
      item: this.academyProgramPresenter.presentPublicProgramDetails(
        program,
        input.locale,
        input.requestCountryIsoCode,
      ),
    };
  }
}

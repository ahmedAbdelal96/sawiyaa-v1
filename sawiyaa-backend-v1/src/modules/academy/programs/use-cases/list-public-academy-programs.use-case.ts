import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { ListPublicAcademyProgramsDto } from '../dto/list-public-academy-programs.dto';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';

@Injectable()
export class ListPublicAcademyProgramsUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
  ) {}

  async execute(
    input: ListPublicAcademyProgramsDto & {
      locale: SupportedLocale;
      requestCountryIsoCode: string | null;
    },
  ) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 12;
    const [items, totalItems] =
      await this.academyProgramRepository.listPublicPrograms({
        page,
        limit,
        q: input.q,
      });

    return {
      items: items.map((program) =>
        this.academyProgramPresenter.presentPublicProgramItem(
          program,
          input.locale,
          input.requestCountryIsoCode,
        ),
      ),
      pagination: this.academyProgramPresenter.presentPagination({
        page,
        limit,
        totalItems,
      }),
    };
  }
}

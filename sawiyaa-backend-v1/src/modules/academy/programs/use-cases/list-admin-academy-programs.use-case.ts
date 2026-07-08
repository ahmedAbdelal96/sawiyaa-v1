import { Injectable } from '@nestjs/common';
import { ListAdminAcademyProgramsDto } from '../dto/list-admin-academy-programs.dto';
import { AcademyProgramPresenter } from '../presenters/academy-program.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';

@Injectable()
export class ListAdminAcademyProgramsUseCase {
  constructor(
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramPresenter: AcademyProgramPresenter,
  ) {}

  async execute(input: ListAdminAcademyProgramsDto) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 12;
    const [items, totalItems] = await this.academyProgramRepository.listAdminPrograms(
      {
        page,
        limit,
        status: input.status,
        q: input.q,
      },
    );

    return {
      items: items.map((program) =>
        this.academyProgramPresenter.presentAdminProgramItem(program),
      ),
      pagination: this.academyProgramPresenter.presentPagination({
        page,
        limit,
        totalItems,
      }),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PackagePlanPresenter } from '../presenters/package-plan.presenter';
import { PackagePlanRepository } from '../repositories/package-plan.repository';

@Injectable()
export class ListPackagePlansUseCase {
  constructor(
    private readonly packagePlanRepository: PackagePlanRepository,
    private readonly packagePlanPresenter: PackagePlanPresenter,
  ) {}

  async execute() {
    const items = await this.packagePlanRepository.listAll();

    return {
      items: items.map((item) => this.packagePlanPresenter.toViewModel(item)),
    };
  }
}

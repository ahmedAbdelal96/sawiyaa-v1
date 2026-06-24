import { Injectable, NotFoundException } from '@nestjs/common';
import { PackagePlanPresenter } from '../presenters/package-plan.presenter';
import { PackagePlanRepository } from '../repositories/package-plan.repository';

@Injectable()
export class GetPackagePlanUseCase {
  constructor(
    private readonly packagePlanRepository: PackagePlanRepository,
    private readonly packagePlanPresenter: PackagePlanPresenter,
  ) {}

  async execute(input: { code: string }) {
    const plan = await this.packagePlanRepository.findByCode(
      input.code.trim().toUpperCase(),
    );

    if (!plan) {
      throw new NotFoundException({
        messageKey: 'packagePlans.errors.notFound',
        error: 'PACKAGE_PLAN_NOT_FOUND',
      });
    }

    return {
      item: this.packagePlanPresenter.toViewModel(plan),
    };
  }
}

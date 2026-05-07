import { Injectable } from '@nestjs/common';
import { PackagePlanPresenter } from '../presenters/package-plan.presenter';
import { PackagePlanAdminService } from '../services/package-plan-admin.service';

@Injectable()
export class UpdatePackagePlanUseCase {
  constructor(
    private readonly packagePlanPresenter: PackagePlanPresenter,
    private readonly packagePlanAdminService: PackagePlanAdminService,
  ) {}

  async execute(input: {
    code: string;
    title?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    changedByUserId?: string | null;
  }) {
    const updated = await this.packagePlanAdminService.updatePlan({
      code: input.code,
      title: input.title,
      description: input.description,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      changedByUserId: input.changedByUserId ?? null,
    });

    return {
      item: this.packagePlanPresenter.toViewModel(updated),
    };
  }
}

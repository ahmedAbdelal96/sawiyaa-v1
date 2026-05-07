import { Injectable } from '@nestjs/common';
import { PackagePlanAdminService } from '../services/package-plan-admin.service';

@Injectable()
export class GetPackagePlanSettingsUseCase {
  constructor(
    private readonly packagePlanAdminService: PackagePlanAdminService,
  ) {}

  async execute() {
    return {
      item: await this.packagePlanAdminService.getSettings(),
    };
  }
}

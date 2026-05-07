import { Injectable } from '@nestjs/common';
import { PackagePlanAdminService } from '../services/package-plan-admin.service';

@Injectable()
export class UpdatePackagePlanSettingsUseCase {
  constructor(
    private readonly packagePlanAdminService: PackagePlanAdminService,
  ) {}

  async execute(input: {
    packagesEnabled?: boolean;
    packagesPurchaseEnabled?: boolean;
    changedByUserId?: string | null;
  }) {
    return {
      item: await this.packagePlanAdminService.updateSettings({
        packagesEnabled: input.packagesEnabled,
        packagesPurchaseEnabled: input.packagesPurchaseEnabled,
        changedByUserId: input.changedByUserId ?? null,
      }),
    };
  }
}

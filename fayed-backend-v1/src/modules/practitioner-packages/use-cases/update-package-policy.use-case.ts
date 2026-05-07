import { Injectable } from '@nestjs/common';
import { UpdatePackagePolicyDto } from '../dto/admin-package-policy.dto';
import { PackagePolicyService } from '../services/package-policy.service';

@Injectable()
export class UpdatePackagePolicyUseCase {
  constructor(private readonly packagePolicyService: PackagePolicyService) {}

  async execute(input: {
    payload: UpdatePackagePolicyDto;
    changedByUserId?: string | null;
  }) {
    const created = await this.packagePolicyService.update({
      maxNonArchivedPackages: input.payload.maxNonArchivedPackages,
      practitionerId: input.payload.practitionerId ?? null,
      changedByUserId: input.changedByUserId ?? null,
    });

    return {
      item: {
        scopeType: created.scopeType,
        scopeRefId: created.scopeRefId,
        value: created.valueNumber?.toString() ?? null,
        isActive: created.isActive,
      },
    };
  }
}

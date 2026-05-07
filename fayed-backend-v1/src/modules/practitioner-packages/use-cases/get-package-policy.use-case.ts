import { Injectable } from '@nestjs/common';
import { PackagePolicyService } from '../services/package-policy.service';

@Injectable()
export class GetPackagePolicyUseCase {
  constructor(private readonly packagePolicyService: PackagePolicyService) {}

  async execute(input?: { practitionerId?: string | null }) {
    return this.packagePolicyService.resolve(input);
  }
}

import { ServiceUnavailableException, Injectable } from '@nestjs/common';
import { CONFIG_KEYS } from '@modules/config/registry/config-key.constants';
import { ConfigRuntimeService } from '@modules/config/services/config-runtime.service';

@Injectable()
export class PackagePlanPolicyService {
  constructor(private readonly configRuntimeService: ConfigRuntimeService) {}

  async assertPackagesEnabled(): Promise<void> {
    const enabled = await this.configRuntimeService.getBoolean(
      CONFIG_KEYS.packages.enabled,
    );

    if (enabled === false) {
      throw new ServiceUnavailableException({
        messageKey: 'packagePlans.errors.featureDisabled',
        error: 'PACKAGE_PLANS_FEATURE_DISABLED',
      });
    }
  }

  async assertPurchasesEnabled(): Promise<void> {
    const enabled = await this.configRuntimeService.getBoolean(
      CONFIG_KEYS.packages.purchaseEnabled,
    );

    if (enabled === false) {
      throw new ServiceUnavailableException({
        messageKey: 'packagePlans.errors.purchaseDisabled',
        error: 'PACKAGE_PLANS_PURCHASE_DISABLED',
      });
    }
  }

  resolveDefaultPreviewCurrency(input: {
    practitionerCurrencyCode: string | null;
  }): string {
    const normalized =
      input.practitionerCurrencyCode?.trim().toUpperCase() ?? '';

    if (normalized === 'EGP' || normalized === 'USD') {
      return normalized;
    }

    return 'EGP';
  }
}

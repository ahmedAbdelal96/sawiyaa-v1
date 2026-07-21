import { MODULE_METADATA } from '@nestjs/common/constants';
import { AdminPackagePlanSettingsController } from './controllers/admin-package-plan-settings.controller';
import { AdminPackagePlansController } from './controllers/admin-package-plans.controller';
import { PackagePlansModule } from './package-plans.module';

describe('PackagePlansModule route registration', () => {
  it('registers the static settings controller before the dynamic package-code controller', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      PackagePlansModule,
    ) as unknown[];

    expect(controllers.indexOf(AdminPackagePlanSettingsController)).toBeLessThan(
      controllers.indexOf(AdminPackagePlansController),
    );
  });
});

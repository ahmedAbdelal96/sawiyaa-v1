import { PATH_METADATA } from '@nestjs/common/constants';
import { AdminPackagePlanSettingsController } from './admin-package-plan-settings.controller';

describe('AdminPackagePlanSettingsController routes', () => {
  it('uses the admin package plan settings route', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, AdminPackagePlanSettingsController),
    ).toBe('admin/package-plans/settings');
  });
});

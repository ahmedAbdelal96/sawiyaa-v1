import { PATH_METADATA } from '@nestjs/common/constants';
import { AdminPackagePlansController } from './admin-package-plans.controller';

describe('AdminPackagePlansController routes', () => {
  it('uses the admin package plans route', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, AdminPackagePlansController),
    ).toBe('admin/package-plans');
  });

  it('exposes update and availability toggle routes', () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        AdminPackagePlansController.prototype.update,
      ),
    ).toBe(':code');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        AdminPackagePlansController.prototype.enable,
      ),
    ).toBe(':code/enable');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        AdminPackagePlansController.prototype.disable,
      ),
    ).toBe(':code/disable');
  });
});

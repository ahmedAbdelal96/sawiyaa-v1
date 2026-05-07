import { PATH_METADATA } from '@nestjs/common/constants';
import { AdminPackagePolicyController } from './admin-package-policy.controller';

describe('AdminPackagePolicyController routes', () => {
  it('uses the nested policy route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AdminPackagePolicyController)).toBe(
      'admin/practitioner-packages/settings/policy',
    );
  });
});

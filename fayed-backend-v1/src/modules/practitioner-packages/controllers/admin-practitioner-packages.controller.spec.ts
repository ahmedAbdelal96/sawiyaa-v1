import { PATH_METADATA } from '@nestjs/common/constants';
import { AdminPractitionerPackagesController } from './admin-practitioner-packages.controller';

describe('AdminPractitionerPackagesController routes', () => {
  it('uses the admin practitioner packages route', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, AdminPractitionerPackagesController),
    ).toBe('admin/practitioner-packages');
  });
});

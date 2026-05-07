import { PATH_METADATA } from '@nestjs/common/constants';
import { PractitionerPackagesController } from './practitioner-packages.controller';

describe('PractitionerPackagesController routes', () => {
  it('uses the me-scoped practitioner route convention', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PractitionerPackagesController)).toBe(
      'practitioners/me/packages',
    );
  });
});

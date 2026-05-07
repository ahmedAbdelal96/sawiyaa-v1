import { PATH_METADATA } from '@nestjs/common/constants';
import { PublicPractitionerPackagesController } from './public-practitioner-packages.controller';

describe('PublicPractitionerPackagesController routes', () => {
  it('uses the public practitioner base route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PublicPractitionerPackagesController)).toBe(
      'public/practitioners',
    );
  });
});

import { PATH_METADATA } from '@nestjs/common/constants';
import { PublicPackagePlansController } from './public-package-plans.controller';

describe('PublicPackagePlansController routes', () => {
  it('uses the public practitioner package plans route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PublicPackagePlansController)).toBe(
      'public/practitioners',
    );
  });
});

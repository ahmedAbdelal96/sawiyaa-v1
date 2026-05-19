import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from './app.module';
import { PackagePlansModule } from './modules/package-plans/package-plans.module';
import { PractitionerPackagesModule } from './modules/practitioner-packages/practitioner-packages.module';

describe('AppModule package-plan wiring', () => {
  it('registers package plans and does not register the deprecated practitioner package API', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) ?? [];

    expect(imports).toContain(PackagePlansModule);
    expect(imports).not.toContain(PractitionerPackagesModule);
  });
});

import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from './app.module';
import { PackagePlansModule } from './modules/package-plans/package-plans.module';

describe('AppModule package-plan wiring', () => {
  it('registers package plans', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) ?? [];

    expect(imports).toContain(PackagePlansModule);
  });
});

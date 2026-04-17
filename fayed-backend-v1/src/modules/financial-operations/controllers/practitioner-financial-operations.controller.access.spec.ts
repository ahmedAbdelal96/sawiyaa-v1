import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PractitionerFinancialOperationsController } from './practitioner-financial-operations.controller';

describe('PractitionerFinancialOperationsController access contract', () => {
  it('is practitioner self-scope only', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, PractitionerFinancialOperationsController);
    expect(roles).toEqual([AppRole.PRACTITIONER]);
  });

  it('enforces auth and role guards', () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, PractitionerFinancialOperationsController) ?? [];

    expect(guards).toContain(JwtAccessAuthGuard);
    expect(guards).toContain(RolesGuard);
  });
});

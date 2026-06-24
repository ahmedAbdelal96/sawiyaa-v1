import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminTrainingsController } from './admin-trainings.controller';

describe('AdminTrainingsController access contract', () => {
  it('requires ADMIN role', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminTrainingsController);
    expect(roles).toEqual([AppRole.ADMIN]);
  });

  it('enforces auth and role guards', () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, AdminTrainingsController) ?? [];

    expect(guards).toContain(JwtAccessAuthGuard);
    expect(guards).toContain(RolesGuard);
  });
});

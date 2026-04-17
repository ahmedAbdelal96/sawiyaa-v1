import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { ModerationReportsController } from './moderation-reports.controller';

describe('ModerationReportsController access contract', () => {
  it('requires eligible moderation intake roles', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, ModerationReportsController);
    expect(roles).toEqual([
      AppRole.PATIENT,
      AppRole.PRACTITIONER,
      AppRole.SUPPORT_AGENT,
      AppRole.ADMIN,
    ]);
  });

  it('enforces auth and role guards', () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, ModerationReportsController) ?? [];

    expect(guards).toContain(JwtAccessAuthGuard);
    expect(guards).toContain(RolesGuard);
  });
});


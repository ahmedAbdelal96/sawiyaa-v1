import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminModerationReportsController } from './admin-moderation-reports.controller';

describe('AdminModerationReportsController access contract', () => {
  it('requires moderation reviewer roles only', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminModerationReportsController);
    expect(roles).toEqual([
      AppRole.ADMIN,
      AppRole.SUPPORT_AGENT,
      AppRole.CONTENT_REVIEWER,
    ]);
  });

  it('enforces auth and role guards', () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, AdminModerationReportsController) ?? [];

    expect(guards).toContain(JwtAccessAuthGuard);
    expect(guards).toContain(RolesGuard);
  });
});

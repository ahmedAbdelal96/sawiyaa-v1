import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminSessionsOperationsController } from './admin-sessions-operations.controller';

describe('AdminSessionsOperationsController access contract', () => {
  it('keeps controller scoped to admin and support roles', () => {
    const classRoles = Reflect.getMetadata(
      ROLES_KEY,
      AdminSessionsOperationsController,
    ) as unknown as AppRole[] | undefined;
    expect(classRoles).toEqual([AppRole.ADMIN, AppRole.SUPPORT_AGENT]);
  });

  it('enforces auth and roles guards at controller level', () => {
    const classGuards =
      (Reflect.getMetadata(
        GUARDS_METADATA,
        AdminSessionsOperationsController,
      ) as unknown as unknown[] | undefined) ?? [];

    expect(classGuards).toContain(JwtAccessAuthGuard);
    expect(classGuards).toContain(RolesGuard);
  });

  it('exposes admin list, runtime inspection and attendance read handlers', () => {
    const proto = AdminSessionsOperationsController.prototype as unknown as {
      list: unknown;
      inspectRuntime: unknown;
      getAttendance: unknown;
    };

    expect(typeof proto.list).toBe('function');
    expect(typeof proto.inspectRuntime).toBe('function');
    expect(typeof proto.getAttendance).toBe('function');
  });
});

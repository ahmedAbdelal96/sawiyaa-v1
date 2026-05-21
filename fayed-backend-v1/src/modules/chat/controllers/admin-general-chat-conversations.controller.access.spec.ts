import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminGeneralChatConversationsController } from './admin-general-chat-conversations.controller';

const getControllerMethod = (name: keyof AdminGeneralChatConversationsController) =>
  (AdminGeneralChatConversationsController.prototype as unknown as Record<
    string,
    unknown
  >)[name] as (...args: never[]) => unknown;

describe('AdminGeneralChatConversationsController access contract', () => {
  it('enforces auth/role/permission guards at controller level', () => {
    const classGuards = (Reflect.getMetadata(
      GUARDS_METADATA,
      AdminGeneralChatConversationsController,
    ) ?? []) as unknown[];

    expect(classGuards).toContain(JwtAccessAuthGuard);
    expect(classGuards).toContain(RolesGuard);
    expect(classGuards).toContain(PermissionsGuard);
  });

  it('allows admin/support class roles only', () => {
    const classRoles = Reflect.getMetadata(
      ROLES_KEY,
      AdminGeneralChatConversationsController,
    ) as AppRole[] | undefined;

    expect(classRoles).toEqual([
      AppRole.ADMIN,
      AppRole.SUPER_ADMIN,
      AppRole.SUPPORT_AGENT,
    ]);
  });

  it('requires read permission for list/detail/messages and attachment read for streams', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, getControllerMethod('list'))).toEqual([
      PermissionKey.CHAT_CONVERSATIONS_READ,
    ]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, getControllerMethod('detail')),
    ).toEqual([PermissionKey.CHAT_CONVERSATIONS_READ]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, getControllerMethod('listMessages')),
    ).toEqual([PermissionKey.CHAT_CONVERSATIONS_READ]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, getControllerMethod('streamAttachment')),
    ).toEqual([PermissionKey.CHAT_ATTACHMENTS_READ]);
  });

  it('requires moderate permission for disable and enable', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, getControllerMethod('disable'))).toEqual([
      PermissionKey.CHAT_CONVERSATIONS_MODERATE,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, getControllerMethod('enable'))).toEqual([
      PermissionKey.CHAT_CONVERSATIONS_MODERATE,
    ]);
  });
});

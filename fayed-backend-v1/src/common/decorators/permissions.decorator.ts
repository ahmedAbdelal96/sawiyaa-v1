import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../constants/auth-metadata.constants';
import { PermissionKey } from '../enums/permission-key.enum';

/**
 * Declares explicit permissions required by a route.
 * PermissionsGuard enforces these checks after authentication/role gates.
 */
export const Permissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

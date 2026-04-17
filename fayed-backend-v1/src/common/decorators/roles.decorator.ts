import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/auth-metadata.constants';
import { AppRole } from '../enums/app-role.enum';

/**
 * Declares which application roles may access a route.
 * RolesGuard reads this metadata after authentication has already populated request.user.
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

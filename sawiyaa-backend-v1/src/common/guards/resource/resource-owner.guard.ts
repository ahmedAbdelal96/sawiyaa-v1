import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RESOURCE_OWNER_OPTIONS_KEY } from '../../constants/auth-metadata.constants';
import { AppRole } from '../../enums/app-role.enum';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { ResourceOwnerOptions } from '../../interfaces/resource-owner-options.interface';
import { forbid, getAuthenticatedUser } from '../../utils/auth-request.util';

/**
 * Generic ownership guard.
 * It compares the current user with a route param or a request-attached owner id and optionally allows admins through.
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options =
      this.reflector.getAllAndOverride<ResourceOwnerOptions>(
        RESOURCE_OWNER_OPTIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? {};

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = getAuthenticatedUser(request);

    if (options.allowAdminOverride && user.roles.includes(AppRole.ADMIN)) {
      return true;
    }

    const ownerIdFromParam = options.paramKey
      ? request.params?.[options.paramKey]
      : undefined;
    const ownerIdFromRequest = options.requestOwnerField
      ? request[options.requestOwnerField]
      : undefined;
    const ownerId = ownerIdFromParam ?? ownerIdFromRequest;

    if (!ownerId || ownerId !== user.id) {
      forbid('You do not own this resource', 'RESOURCE_OWNER_REQUIRED');
    }

    return true;
  }
}

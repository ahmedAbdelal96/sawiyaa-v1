import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PRACTITIONER_APPLICATION_OWNER_OPTIONS_KEY } from '../../constants/auth-metadata.constants';
import { AppRole } from '../../enums/app-role.enum';
import { AuthenticatedRequest } from '../../interfaces/authenticated-request.interface';
import { PractitionerApplicationOwnerOptions } from '../../interfaces/resource-owner-options.interface';
import { forbid, getAuthenticatedUser } from '../../utils/auth-request.util';

/**
 * Practitioner application ownership guard.
 * It protects routes around the practitioner's own application without forcing full admin privileges.
 */
@Injectable()
export class PractitionerApplicationOwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options =
      this.reflector.getAllAndOverride<PractitionerApplicationOwnerOptions>(
        PRACTITIONER_APPLICATION_OWNER_OPTIONS_KEY,
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
    const ownerId =
      ownerIdFromParam ??
      ownerIdFromRequest ??
      user.practitionerApplicationId ??
      null;

    if (!ownerId || ownerId !== user.practitionerApplicationId) {
      forbid(
        'You do not own this practitioner application',
        'PRACTITIONER_APPLICATION_OWNER_REQUIRED',
      );
    }

    return true;
  }
}

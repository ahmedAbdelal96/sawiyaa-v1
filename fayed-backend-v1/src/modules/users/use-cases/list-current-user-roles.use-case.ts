import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CurrentUserMapper } from '../mappers/current-user.mapper';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { buildRoleSummary } from '../utils/role-summary.util';

/**
 * Role listing stays separate because some screens need role data only,
 * without fetching the full current-user summary payload.
 */
@Injectable()
export class ListCurrentUserRolesUseCase {
  constructor(
    private readonly userRoleRepository: UserRoleRepository,
    private readonly currentUserMapper: CurrentUserMapper,
  ) {}

  async execute(authenticatedUser: AuthenticatedUser) {
    const roles = this.currentUserMapper.mapRoles(
      await this.userRoleRepository.listCurrentUserRoles(authenticatedUser.id),
    );

    return {
      userId: authenticatedUser.id,
      roles,
      roleSummary: buildRoleSummary(roles),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { GetCurrentUserUseCase } from './get-current-user.use-case';

/**
 * Profile-link summary is kept as a dedicated use case so future modules can reuse it
 * without taking a dependency on the full /users/me response shape.
 */
@Injectable()
export class GetCurrentUserProfileLinksUseCase {
  constructor(private readonly getCurrentUserUseCase: GetCurrentUserUseCase) {}

  async execute(authenticatedUser: AuthenticatedUser) {
    const currentUser =
      await this.getCurrentUserUseCase.execute(authenticatedUser);

    return {
      userId: currentUser.userId,
      profileLinks: currentUser.profileLinks,
    };
  }
}

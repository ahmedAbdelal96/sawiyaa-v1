import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { GetCurrentUserUseCase } from './get-current-user.use-case';

/**
 * Security-state reads stay explicit because clients often need them to drive guard UX,
 * banners, and account recovery prompts without consuming the entire summary object.
 */
@Injectable()
export class GetCurrentUserSecurityStateUseCase {
  constructor(private readonly getCurrentUserUseCase: GetCurrentUserUseCase) {}

  async execute(authenticatedUser: AuthenticatedUser) {
    const currentUser =
      await this.getCurrentUserUseCase.execute(authenticatedUser);

    return {
      userId: currentUser.userId,
      securityState: currentUser.securityState,
    };
  }
}

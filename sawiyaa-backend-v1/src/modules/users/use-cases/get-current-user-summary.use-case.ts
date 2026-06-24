import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { GetCurrentUserUseCase } from './get-current-user.use-case';

/**
 * Summary endpoint is the main frontend-oriented projection.
 * It returns one coherent object so clients do not have to stitch together basics, security, and linked profile state manually.
 */
@Injectable()
export class GetCurrentUserSummaryUseCase {
  constructor(private readonly getCurrentUserUseCase: GetCurrentUserUseCase) {}

  execute(authenticatedUser: AuthenticatedUser) {
    return this.getCurrentUserUseCase.execute(authenticatedUser);
  }
}

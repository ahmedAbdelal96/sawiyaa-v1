import { Controller, ForbiddenException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ResolveSessionJoinContractUseCase } from '../use-cases/resolve-session-join-contract.use-case';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('sessions')
export class SessionJoinBootstrapController {
  constructor(
    private readonly resolveSessionJoinContractUseCase: ResolveSessionJoinContractUseCase,
  ) {}

  @Post(':sessionId/join-bootstrap')
  @ApiOperation({
    summary: 'Issue a short-lived participant join bootstrap',
    description: 'The response contains only the participant room URL and short-lived token required by the video SDK.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session id' })
  @ApiResponse({ status: 200, description: 'Participant-scoped join payload' })
  async bootstrap(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    const actorType = currentUser.roles.includes(AppRole.PATIENT)
      ? 'PATIENT'
      : currentUser.roles.includes(AppRole.PRACTITIONER)
        ? 'PRACTITIONER'
        : null;
    if (!actorType) {
      throw new ForbiddenException('Session participant role is required');
    }

    const result = await this.resolveSessionJoinContractUseCase.execute({
      userId: currentUser.id,
      sessionId,
      actorType,
    });
    const item = result.item;
    return {
      item: {
        sessionId: item.sessionId,
        provider: item.provider,
        canJoin: item.canJoin,
        blockedReason: item.blockedReason,
        joinAvailableAt: item.availableAt,
        joinExpiresAt: item.expiresAt,
        roomUrl: item.canJoin ? item.roomUrl : null,
        joinToken: item.canJoin ? item.joinToken : null,
      },
    };
  }
}

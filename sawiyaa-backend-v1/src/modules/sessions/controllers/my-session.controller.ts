import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { GetMyNextSessionUseCase } from '../use-cases/get-my-next-session.use-case';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('users/me')
export class MySessionController {
  constructor(private readonly getMyNextSessionUseCase: GetMyNextSessionUseCase) {}

  @Get('next-session')
  @ApiOperation({ summary: 'Get the authenticated user next actionable session' })
  @ApiResponse({ status: 200, description: 'The canonical next-session model or null' })
  nextSession(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getMyNextSessionUseCase.execute({ currentUser, locale });
  }
}

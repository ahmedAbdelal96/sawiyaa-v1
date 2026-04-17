import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CreateModerationReportDto } from '../dto/create-moderation-report.dto';
import { ModerationReportItemSuccessResponseDto } from '../dto/moderation-response.dto';
import { CreateModerationReportUseCase } from '../use-cases/create-moderation-report.use-case';
import { MODERATION_INTAKE_ALLOWED_ROLES } from '../types/moderation.types';

@ApiTags('Moderation')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(...MODERATION_INTAKE_ALLOWED_ROLES)
@Controller('moderation/reports')
export class ModerationReportsController {
  constructor(
    private readonly createModerationReportUseCase: CreateModerationReportUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit moderation/safety report intake case' })
  @ApiBody({ type: CreateModerationReportDto })
  @ApiResponse({ status: 201, type: ModerationReportItemSuccessResponseDto })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateModerationReportDto,
  ) {
    return this.createModerationReportUseCase
      .execute({
        currentUser,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }
}


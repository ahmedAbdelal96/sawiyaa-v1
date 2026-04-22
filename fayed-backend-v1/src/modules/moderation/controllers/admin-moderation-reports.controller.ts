import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ExecuteModerationActionDto } from '../dto/execute-moderation-action.dto';
import { ListModerationCasesDto } from '../dto/list-moderation-cases.dto';
import {
  ModerationActionExecutionSuccessResponseDto,
  ModerationCaseDetailSuccessResponseDto,
  ModerationQueueSuccessResponseDto,
} from '../dto/moderation-response.dto';
import { MODERATION_REVIEW_ALLOWED_ROLES } from '../types/moderation.types';
import { ExecuteModerationActionUseCase } from '../use-cases/execute-moderation-action.use-case';
import { GetModerationCaseUseCase } from '../use-cases/get-moderation-case.use-case';
import { ListModerationCasesUseCase } from '../use-cases/list-moderation-cases.use-case';

@ApiTags('Moderation')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(...MODERATION_REVIEW_ALLOWED_ROLES)
@Controller('admin/moderation/reports')
export class AdminModerationReportsController {
  constructor(
    private readonly listModerationCasesUseCase: ListModerationCasesUseCase,
    private readonly getModerationCaseUseCase: GetModerationCaseUseCase,
    private readonly executeModerationActionUseCase: ExecuteModerationActionUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List moderation report cases for reviewer queue (contract baseline)',
    description:
      'Slice 1 freezes ownership/filters/pagination semantics. Deterministic triage read depth is expanded in the next rollout slice without contract churn.',
  })
  @ApiResponse({ status: 200, type: ModerationQueueSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid moderation reports filter semantics',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support/content-reviewer roles can access',
  })
  list(@Query() query: ListModerationCasesDto) {
    return this.listModerationCasesUseCase.execute({ query }).then((data) => ({
      success: true as const,
      data,
    }));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one moderation case detail for reviewer context',
  })
  @ApiParam({ name: 'id', description: 'Moderation report id' })
  @ApiResponse({ status: 200, type: ModerationCaseDetailSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Moderation report id must be a valid UUID',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support/content-reviewer roles can access',
  })
  @ApiNotFoundResponse({
    description: 'Moderation report was not found in scope',
  })
  getById(@Param('id', new ParseUUIDPipe()) reportId: string) {
    return this.getModerationCaseUseCase.execute({ reportId }).then((data) => ({
      success: true as const,
      data,
    }));
  }

  @Patch(':id/actions')
  @ApiOperation({ summary: 'Execute moderation action on one case' })
  @ApiResponse({
    status: 200,
    type: ModerationActionExecutionSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only admin/support/content-reviewer roles can access',
  })
  executeAction(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') reportId: string,
    @Body() body: ExecuteModerationActionDto,
  ) {
    return this.executeModerationActionUseCase
      .execute({
        currentUser,
        reportId,
        payload: body,
      })
      .then((data) => ({
        success: true as const,
        data,
      }));
  }
}

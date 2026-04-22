import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { CreateCommissionRuleDto } from '../dto/create-commission-rule.dto';
import {
  CommissionRuleItemSuccessResponseDto,
  CommissionRulesListSuccessResponseDto,
} from '../dto/financial-rules-response.dto';
import { ListCommissionRulesDto } from '../dto/list-commission-rules.dto';
import { CreateCommissionRuleUseCase } from '../use-cases/create-commission-rule.use-case';
import { ListCommissionRulesUseCase } from '../use-cases/list-commission-rules.use-case';

@ApiTags('Admin - Financial Rules')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, AdminGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/commission-rules')
export class AdminCommissionRulesController {
  constructor(
    private readonly createCommissionRuleUseCase: CreateCommissionRuleUseCase,
    private readonly listCommissionRulesUseCase: ListCommissionRulesUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create commission rule',
    description:
      'Creates a commission rule that the financial resolution layer can later reuse from Payments and Ledger posting flows.',
  })
  @ApiBody({ type: CreateCommissionRuleDto })
  @ApiResponse({ status: 201, type: CommissionRuleItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Rule dates or percentage split are invalid',
  })
  @ApiConflictResponse({ description: 'Commission rule slug already exists' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  create(@Body() body: CreateCommissionRuleDto) {
    return this.createCommissionRuleUseCase.execute(body);
  }

  @Get()
  @ApiOperation({
    summary: 'List commission rules',
    description:
      'Returns commission rules for operational review. Resolution still happens centrally in the financial rules service.',
  })
  @ApiResponse({ status: 200, type: CommissionRulesListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  list(@Query() query: ListCommissionRulesDto) {
    return this.listCommissionRulesUseCase.execute(query);
  }
}

import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
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
import { UpdateRevenueShareRulesDto } from '../dto/revenue-share-rules.dto';
import { RevenueShareRulesItemSuccessResponseDto } from '../dto/financial-rules-response.dto';
import { GetRevenueShareRulesUseCase } from '../use-cases/get-revenue-share-rules.use-case';
import { UpdateRevenueShareRulesUseCase } from '../use-cases/update-revenue-share-rules.use-case';

@ApiTags('Admin - Financial Rules')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, AdminGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/revenue-share-rules')
export class AdminRevenueShareRulesController {
  constructor(
    private readonly getRevenueShareRulesUseCase: GetRevenueShareRulesUseCase,
    private readonly updateRevenueShareRulesUseCase: UpdateRevenueShareRulesUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get revenue share rules (local vs cross-border)',
    description:
      'Returns the default platform/practitioner share percentages used by session payment allocation. Historical payments keep their stored snapshots.',
  })
  @ApiResponse({ status: 200, type: RevenueShareRulesItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  get() {
    return this.getRevenueShareRulesUseCase.execute();
  }

  @Put()
  @ApiOperation({
    summary: 'Update revenue share rules (local vs cross-border)',
    description:
      'Updates the default commission splits for future allocations. Existing payments and ledger entries remain unchanged.',
  })
  @ApiBody({ type: UpdateRevenueShareRulesDto })
  @ApiResponse({ status: 200, type: RevenueShareRulesItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation failed or percentage split is invalid',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  update(@Body() body: UpdateRevenueShareRulesDto) {
    return this.updateRevenueShareRulesUseCase.execute(body);
  }
}


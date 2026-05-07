import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
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
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import {
  PractitionerManualPayoutBalanceSuccessResponseDto,
  PractitionerManualPayoutItemSuccessResponseDto,
  PractitionerManualPayoutListSuccessResponseDto,
  PractitionerManualPayoutSummaryListSuccessResponseDto,
} from '../dto/financial-operations-response.dto';
import {
  GetAdminPractitionerPayoutBalanceDto,
  ListAdminPractitionerManualPayoutsDto,
  ListAdminPractitionerPayoutSummariesDto,
  RecordAdminPractitionerManualPayoutDto,
} from '../dto/admin-practitioner-payouts.dto';
import { GetAdminPractitionerPayoutBalanceUseCase } from '../use-cases/get-admin-practitioner-payout-balance.use-case';
import { ListAdminPractitionerPayoutSummariesUseCase } from '../use-cases/list-admin-practitioner-payout-summaries.use-case';
import { ListAdminPractitionerManualPayoutsUseCase } from '../use-cases/list-admin-practitioner-manual-payouts.use-case';
import { RecordAdminPractitionerManualPayoutUseCase } from '../use-cases/record-admin-practitioner-manual-payout.use-case';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';

@ApiTags('Admin - Practitioner Manual Payouts')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN)
@Controller('admin/practitioner-payouts')
export class AdminPractitionerManualPayoutsController {
  constructor(
    private readonly listPractitionerSummariesUseCase: ListAdminPractitionerPayoutSummariesUseCase,
    private readonly getBalanceUseCase: GetAdminPractitionerPayoutBalanceUseCase,
    private readonly listPayoutsUseCase: ListAdminPractitionerManualPayoutsUseCase,
    private readonly recordPayoutUseCase: RecordAdminPractitionerManualPayoutUseCase,
  ) {}

  @Get('practitioners')
  @ApiOperation({
    summary: 'List practitioner payout summaries',
    description:
      'Returns practitioners that have payable or package-related balances, with separate EGP and USD summaries for the admin payout list screen.',
  })
  @ApiResponse({
    status: 200,
    type: PractitionerManualPayoutSummaryListSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  listPractitioners(
    @Query() query: ListAdminPractitionerPayoutSummariesDto,
  ) {
    return this.listPractitionerSummariesUseCase.execute({ query });
  }

  @Get('practitioners/:practitionerId/balance')
  @ApiOperation({
    summary: 'Get practitioner payout balance',
    description:
      'Returns the simple payout balance for one practitioner and currency, including normal session payable, package released payable, package held amount, and total payable amount.',
  })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner profile id' })
  @ApiResponse({
    status: 200,
    type: PractitionerManualPayoutBalanceSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found' })
  getBalance(
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string,
    @Query() query: GetAdminPractitionerPayoutBalanceDto,
  ) {
    return this.getBalanceUseCase.execute({
      practitionerId,
      currency: query.currency,
    });
  }

  @Get('practitioners/:practitionerId/payouts')
  @ApiOperation({
    summary: 'List practitioner manual payouts',
    description:
      'Returns manual payout records recorded for one practitioner so the admin can review exact transferred amounts.',
  })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner profile id' })
  @ApiResponse({
    status: 200,
    type: PractitionerManualPayoutListSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found' })
  listPayouts(
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string,
    @Query() query: ListAdminPractitionerManualPayoutsDto,
  ) {
    return this.listPayoutsUseCase.execute({
      practitionerId,
      query,
    });
  }

  @Get('history')
  @ApiOperation({
    summary: 'List manual payout history',
    description:
      'Returns manual payout records across practitioners so the admin can review payout history in one place.',
  })
  @ApiResponse({
    status: 200,
    type: PractitionerManualPayoutListSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  listHistory(@Query() query: ListAdminPractitionerManualPayoutsDto) {
    return this.listPayoutsUseCase.execute({
      practitionerId: query.practitionerId,
      query,
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Record practitioner manual payout',
    description:
      'Records the amount actually transferred to a practitioner outside the platform. Partial payout is supported and only the paid amount is deducted from the payable balance.',
  })
  @ApiResponse({
    status: 201,
    type: PractitionerManualPayoutItemSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found' })
  record(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: RecordAdminPractitionerManualPayoutDto,
  ) {
    return this.recordPayoutUseCase.execute({
      body,
      operatorUserId: currentUser.id,
    });
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  LedgerListSuccessResponseDto,
  PractitionerSettlementListSuccessResponseDto,
  WalletItemSuccessResponseDto,
} from '../dto/financial-operations-response.dto';
import {
  ListPractitionerLedgerDto,
  ListPractitionerSettlementsDto,
} from '../dto/list-practitioner-ledger.dto';
import { GetPractitionerWalletUseCase } from '../use-cases/get-practitioner-wallet.use-case';
import { ListPractitionerLedgerEntriesUseCase } from '../use-cases/list-practitioner-ledger-entries.use-case';
import { ListPractitionerSettlementsUseCase } from '../use-cases/list-practitioner-settlements.use-case';

@ApiTags('Practitioner Finance')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@Roles(AppRole.PRACTITIONER)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('practitioners/me')
export class PractitionerFinancialOperationsController {
  constructor(
    private readonly getPractitionerWalletUseCase: GetPractitionerWalletUseCase,
    private readonly listPractitionerLedgerEntriesUseCase: ListPractitionerLedgerEntriesUseCase,
    private readonly listPractitionerSettlementsUseCase: ListPractitionerSettlementsUseCase,
  ) {}

  @Get('wallet')
  @ApiOperation({
    summary: 'Get practitioner wallet summary',
    description:
      'Returns the practitioner wallet derived from ledger state. Wallet is a read model, not the financial source of truth.',
  })
  @ApiResponse({ status: 200, type: WalletItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Only active practitioner accounts may access this route' })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found in scope' })
  wallet(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.getPractitionerWalletUseCase.execute({
      userId: currentUser.id,
    });
  }

  @Get('ledger')
  @ApiOperation({
    summary: 'List practitioner ledger entries',
    description:
      'Returns practitioner ledger entries with pagination. Each earning remains traceable to the related payment/session references.',
  })
  @ApiResponse({ status: 200, type: LedgerListSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid ledger filter semantics' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Only active practitioner accounts may access this route' })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found in scope' })
  ledger(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListPractitionerLedgerDto,
  ) {
    return this.listPractitionerLedgerEntriesUseCase.execute({
      userId: currentUser.id,
      query,
    });
  }

  @Get('settlements')
  @ApiOperation({
    summary: 'List practitioner settlements',
    description:
      'Returns practitioner payout records generated from settlement batches. This endpoint is read-only in this phase.',
  })
  @ApiResponse({ status: 200, type: PractitionerSettlementListSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid settlements filter semantics' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Only active practitioner accounts may access this route' })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found in scope' })
  settlements(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListPractitionerSettlementsDto,
  ) {
    return this.listPractitionerSettlementsUseCase.execute({
      userId: currentUser.id,
      query,
    });
  }
}

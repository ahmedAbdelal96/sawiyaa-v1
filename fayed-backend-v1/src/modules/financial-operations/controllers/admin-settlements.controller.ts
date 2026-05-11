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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  SettlementBatchItemSuccessResponseDto,
  SettlementBatchListSuccessResponseDto,
  SettlementPayoutItemSuccessResponseDto,
  SettlementPayoutListSuccessResponseDto,
  PractitionerSettlementListSuccessResponseDto,
  SettlementDuesDirectoryListSuccessResponseDto,
} from '../dto/financial-operations-response.dto';
import { GenerateSettlementBatchDto } from '../dto/generate-settlement-batch.dto';
import {
  ListPractitionerSettlementsDto,
  ListSettlementBatchesDto,
} from '../dto/list-practitioner-ledger.dto';
import { ListSettlementDuesDirectoryDto } from '../dto/list-settlement-dues-directory.dto';
import {
  MarkSettlementFailedDto,
  MarkSettlementPaidDto,
} from '../dto/mark-settlement.dto';
import {
  ListSettlementPayoutsDto,
  RecordPractitionerSettlementPayoutDto,
} from '../dto/settlement-payout.dto';
import { GenerateSettlementBatchUseCase } from '../use-cases/generate-settlement-batch.use-case';
import { GetSettlementBatchDetailsUseCase } from '../use-cases/get-settlement-batch-details.use-case';
import { ListAdminPractitionerSettlementsUseCase } from '../use-cases/list-admin-practitioner-settlements.use-case';
import { ListPractitionerSettlementPayoutsUseCase } from '../use-cases/list-practitioner-settlement-payouts.use-case';
import { ListSettlementBatchesUseCase } from '../use-cases/list-settlement-batches.use-case';
import { ListSettlementDuesDirectoryUseCase } from '../use-cases/list-settlement-dues-directory.use-case';
import { MarkSettlementFailedUseCase } from '../use-cases/mark-settlement-failed.use-case';
import { MarkSettlementPaidUseCase } from '../use-cases/mark-settlement-paid.use-case';
import { RecordPractitionerSettlementPayoutUseCase } from '../use-cases/record-practitioner-settlement-payout.use-case';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';

@ApiTags('Admin - Settlements')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF)
@Permissions(PermissionKey.SETTLEMENTS_READ)
@Controller('admin/settlements')
export class AdminSettlementsController {
  constructor(
    private readonly generateSettlementBatchUseCase: GenerateSettlementBatchUseCase,
    private readonly listSettlementBatchesUseCase: ListSettlementBatchesUseCase,
    private readonly listSettlementDuesDirectoryUseCase: ListSettlementDuesDirectoryUseCase,
    private readonly getSettlementBatchDetailsUseCase: GetSettlementBatchDetailsUseCase,
    private readonly listAdminPractitionerSettlementsUseCase: ListAdminPractitionerSettlementsUseCase,
    private readonly listPractitionerSettlementPayoutsUseCase: ListPractitionerSettlementPayoutsUseCase,
    private readonly recordPractitionerSettlementPayoutUseCase: RecordPractitionerSettlementPayoutUseCase,
    private readonly markSettlementPaidUseCase: MarkSettlementPaidUseCase,
    private readonly markSettlementFailedUseCase: MarkSettlementFailedUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate legacy settlement batch',
    description:
      'Legacy compatibility path that creates a settlement batch for a specific period/currency and reserves eligible practitioner earning ledger entries for historical batch processing.',
  })
  @ApiBody({ type: GenerateSettlementBatchDto })
  @ApiResponse({ status: 201, type: SettlementBatchItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Settlement period or currency is invalid',
  })
  @ApiConflictResponse({
    description: 'Settlement batch already exists for this period and currency',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @UseGuards(AdminGuard)
  @Roles(AppRole.ADMIN)
  @Permissions(PermissionKey.SETTLEMENTS_WRITE)
  async generate(
    @Body() body: GenerateSettlementBatchDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.generateSettlementBatchUseCase.execute(body);
    this.securityAuditService.logAsync({
      action: 'finance.settlement.generate',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: currentUser.id,
      actorRoles: currentUser.roles,
      resourceType: 'SettlementBatch',
      metadata: {
        periodYear: body.periodYear,
        periodMonth: body.periodMonth,
        currencyCode: body.currencyCode,
      },
    });
    return result;
  }

  @Get()
  @ApiOperation({
    summary: 'List legacy settlement batches',
    description:
      'Returns settlement batches with lightweight totals and pagination for historical or compatibility review only.',
  })
  @ApiResponse({ status: 200, type: SettlementBatchListSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid settlement list filters' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  list(@Query() query: ListSettlementBatchesDto) {
    return this.listSettlementBatchesUseCase.execute(query);
  }

  @Get('practitioner-dues')
  @ApiOperation({
    summary: 'List practitioner settlement dues directory',
    description:
      'Operational practitioner-centric settlements surface. Returns practitioners with currency-level wallet + due summaries, backend-driven filters, pagination, and truthful stats (not derived from a paginated slice).',
  })
  @ApiResponse({
    status: 200,
    type: SettlementDuesDirectoryListSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid filters or pagination values',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  listPractitionerDuesDirectory(
    @Query() query: ListSettlementDuesDirectoryDto,
  ) {
    return this.listSettlementDuesDirectoryUseCase.execute({ query });
  }

  @Get('practitioners/:practitionerId/settlements')
  @ApiOperation({
    summary: 'List practitioner settlement dues',
    description:
      'Returns practitioner settlement rows for an operator review workspace, including batch context and payout snapshots when available.',
  })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner profile id' })
  @ApiResponse({
    status: 200,
    type: PractitionerSettlementListSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid practitioner settlement filters',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found' })
  listPractitionerSettlements(
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string,
    @Query() query: ListPractitionerSettlementsDto,
  ) {
    return this.listAdminPractitionerSettlementsUseCase.execute({
      practitionerId,
      query,
    });
  }

  @Get('practitioners/:practitionerId/payouts')
  @ApiOperation({
    summary: 'List practitioner payout history',
    description:
      'Returns payout history records for a practitioner, including method, source, and operator context.',
  })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner profile id' })
  @ApiResponse({ status: 200, type: SettlementPayoutListSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid practitioner payout filters' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found' })
  listPractitionerPayouts(
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string,
    @Query() query: ListSettlementPayoutsDto,
  ) {
    return this.listPractitionerSettlementPayoutsUseCase.execute({
      practitionerId,
      query,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get legacy settlement batch details',
    description:
      'Returns one settlement batch with all practitioner settlement items created under it for compatibility review.',
  })
  @ApiParam({ name: 'id', description: 'Settlement batch id' })
  @ApiResponse({ status: 200, type: SettlementBatchItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin or support active account is required',
  })
  @ApiNotFoundResponse({ description: 'Settlement batch was not found' })
  details(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.getSettlementBatchDetailsUseCase.execute(id);
  }

  @Post(':id/mark-paid')
  @ApiOperation({
    summary: 'Mark legacy settlement batch as paid',
    description:
      'Marks every unsettled practitioner payout in the batch as paid and posts settlement payout debit ledger entries for traceability in the legacy batch workflow.',
  })
  @ApiParam({ name: 'id', description: 'Settlement batch id' })
  @ApiBody({ type: MarkSettlementPaidDto })
  @ApiResponse({ status: 200, type: SettlementBatchItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description:
      'Settlement batch is in an invalid state for payment completion',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({ description: 'Settlement batch was not found' })
  @UseGuards(AdminGuard)
  @Roles(AppRole.ADMIN)
  @Permissions(PermissionKey.SETTLEMENTS_WRITE)
  async markPaid(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: MarkSettlementPaidDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.markSettlementPaidUseCase.execute({
      batchId: id,
      externalPayoutRef: body.externalPayoutRef,
      payoutMethod: body.payoutMethod,
      transferFeeAmount: body.transferFeeAmount,
      transferFeeTreatment: body.transferFeeTreatment,
      effectiveAt: body.effectiveAt,
      notes: body.notes,
      processedByUserId: currentUser.id,
    });
    this.securityAuditService.logAsync({
      action: 'finance.settlement.mark_paid',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: currentUser.id,
      actorRoles: currentUser.roles,
      resourceType: 'SettlementBatch',
      resourceId: id,
    });
    return result;
  }

  @Post('practitioners/:practitionerId/payouts/:settlementId')
  @ApiOperation({
    summary: 'Record practitioner payout exception',
    description:
      'Records a structured payout for one practitioner settlement row while preserving historical batch settlement records for compatibility.',
  })
  @ApiParam({ name: 'practitionerId', description: 'Practitioner profile id' })
  @ApiParam({ name: 'settlementId', description: 'Practitioner settlement id' })
  @ApiBody({ type: RecordPractitionerSettlementPayoutDto })
  @ApiResponse({ status: 201, type: SettlementPayoutItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Settlement payout state is invalid or data is invalid',
  })
  @ApiConflictResponse({
    description: 'A payout record already exists for this settlement',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({
    description: 'Practitioner profile or settlement row was not found',
  })
  @UseGuards(AdminGuard)
  @Roles(AppRole.ADMIN)
  @Permissions(PermissionKey.SETTLEMENTS_WRITE)
  async recordPractitionerPayout(
    @Param('practitionerId', new ParseUUIDPipe()) practitionerId: string,
    @Param('settlementId', new ParseUUIDPipe()) settlementId: string,
    @Body() body: RecordPractitionerSettlementPayoutDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.recordPractitionerSettlementPayoutUseCase.execute(
      {
        practitionerId,
        settlementId,
        operatorUserId: currentUser.id,
        body,
      },
    );
    this.securityAuditService.logAsync({
      action: 'finance.settlement.payout.record',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: currentUser.id,
      actorRoles: currentUser.roles,
      resourceType: 'PractitionerSettlement',
      resourceId: settlementId,
      targetUserId: practitionerId,
    });
    return result;
  }

  @Post(':id/mark-failed')
  @ApiOperation({
    summary: 'Mark legacy settlement batch as failed',
    description:
      'Marks the batch as failed and releases reserved earning entries back to available balances for future settlement attempts in the legacy compatibility workflow.',
  })
  @ApiParam({ name: 'id', description: 'Settlement batch id' })
  @ApiBody({ type: MarkSettlementFailedDto })
  @ApiResponse({ status: 200, type: SettlementBatchItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Settlement batch is in an invalid state for failure handling',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  @ApiNotFoundResponse({ description: 'Settlement batch was not found' })
  @UseGuards(AdminGuard)
  @Roles(AppRole.ADMIN)
  @Permissions(PermissionKey.SETTLEMENTS_WRITE)
  async markFailed(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: MarkSettlementFailedDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.markSettlementFailedUseCase.execute({
      batchId: id,
      notes: body.notes,
    });
    this.securityAuditService.logAsync({
      action: 'finance.settlement.mark_failed',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: currentUser.id,
      actorRoles: currentUser.roles,
      resourceType: 'SettlementBatch',
      resourceId: id,
    });
    return result;
  }
}

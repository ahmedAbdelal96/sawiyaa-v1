import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { RequireStepUp } from '@common/decorators/step-up.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import {
  AdminPractitionerRecoveryDetailDataResponseDto,
  AdminPractitionerRecoveryListDataResponseDto,
  AdminPractitionerRecoveryMutationResultDto,
  ListAdminPractitionerRecoveriesDto,
  MarkAdminPractitionerRecoveryCollectedDto,
  WaiveAdminPractitionerRecoveryDto,
} from '../dto/admin-practitioner-recoveries.dto';
import { ExportAdminPractitionerRecoveriesCsvUseCase } from '../use-cases/export-admin-practitioner-recoveries-csv.use-case';
import { GetAdminPractitionerRecoveryUseCase } from '../use-cases/get-admin-practitioner-recovery.use-case';
import { ListAdminPractitionerRecoveriesUseCase } from '../use-cases/list-admin-practitioner-recoveries.use-case';
import { MarkAdminPractitionerRecoveryCollectedUseCase } from '../use-cases/mark-admin-practitioner-recovery-collected.use-case';
import { WaiveAdminPractitionerRecoveryUseCase } from '../use-cases/waive-admin-practitioner-recovery.use-case';
import { Response } from 'express';

@ApiTags('Admin - Practitioner Recoveries')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/finance/practitioner-recoveries')
export class AdminPractitionerRecoveriesController {
  constructor(
    private readonly listAdminPractitionerRecoveriesUseCase: ListAdminPractitionerRecoveriesUseCase,
    private readonly exportAdminPractitionerRecoveriesCsvUseCase: ExportAdminPractitionerRecoveriesCsvUseCase,
    private readonly getAdminPractitionerRecoveryUseCase: GetAdminPractitionerRecoveryUseCase,
    private readonly markAdminPractitionerRecoveryCollectedUseCase: MarkAdminPractitionerRecoveryCollectedUseCase,
    private readonly waiveAdminPractitionerRecoveryUseCase: WaiveAdminPractitionerRecoveryUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  @Get()
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'List practitioner recoveries for admin accounting',
    description:
      'Returns practitioner recovery debts with practitioner, session, payment, refund, and review context.',
  })
  @ApiResponse({ status: 200, type: AdminPractitionerRecoveryListDataResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin, super admin, or finance staff active account is required',
  })
  listRecoveries(@Query() query: ListAdminPractitionerRecoveriesDto) {
    return this.listAdminPractitionerRecoveriesUseCase.execute({ query });
  }

  @Get('export.csv')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'Export practitioner recoveries CSV',
    description:
      'Returns a CSV export of practitioner recoveries with linked finance context.',
  })
  @ApiResponse({ status: 200, description: 'Recovery CSV export stream' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin, super admin, or finance staff active account is required',
  })
  async exportRecoveries(
    @Query() query: ListAdminPractitionerRecoveriesDto,
    @Res() response: Response,
  ) {
    const exported =
      await this.exportAdminPractitionerRecoveriesCsvUseCase.execute(query);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.fileName}"`,
    );
    response.setHeader('Cache-Control', 'no-store');
    response.send(exported.content);
  }

  @Get(':id')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'Get one practitioner recovery for admin accounting',
    description:
      'Returns one practitioner recovery with linked refund, payment, session, payout, and action history context.',
  })
  @ApiResponse({
    status: 200,
    type: AdminPractitionerRecoveryDetailDataResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiNotFoundResponse({ description: 'Practitioner recovery was not found' })
  @ApiForbiddenResponse({
    description: 'Admin, super admin, or finance staff active account is required',
  })
  getRecovery(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.getAdminPractitionerRecoveryUseCase.execute({ recoveryId: id });
  }

  @Post(':id/mark-collected')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @RequireStepUp('finance.practitioner-recoveries.collect')
  @ApiOperation({
    summary: 'Mark a practitioner recovery as manually collected',
    description:
      'Records a manual collection against a practitioner recovery. Partial and full collection are supported.',
  })
  @ApiResponse({
    status: 200,
    type: AdminPractitionerRecoveryMutationResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiNotFoundResponse({ description: 'Practitioner recovery was not found' })
  @ApiForbiddenResponse({
    description: 'Admin, super admin, or finance staff active account is required',
  })
  async markCollected(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: MarkAdminPractitionerRecoveryCollectedDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.markAdminPractitionerRecoveryCollectedUseCase.execute({
      recoveryId: id,
      body,
      operatorUserId: currentUser.id,
    });

    this.securityAuditService.logAsync({
      action: 'finance.practitioner-recovery.mark-collected',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: currentUser.id,
      actorRoles: currentUser.roles,
      resourceType: 'PractitionerRecovery',
      resourceId: result.item.recoveryId,
      targetUserId: result.item.practitioner.practitionerId,
      metadata: {
        amountCollected: body.amountCollected,
        note: body.note ?? null,
        idempotencyKey: body.idempotencyKey,
      },
    });

    return {
      success: true as const,
      data: result,
    };
  }

  @Post(':id/waive')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @RequireStepUp('finance.practitioner-recoveries.waive')
  @ApiOperation({
    summary: 'Waive one practitioner recovery',
    description:
      'Marks the remaining amount on a practitioner recovery as waived with a required finance reason.',
  })
  @ApiResponse({
    status: 200,
    type: AdminPractitionerRecoveryMutationResultDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiNotFoundResponse({ description: 'Practitioner recovery was not found' })
  @ApiForbiddenResponse({
    description: 'Admin, super admin, or finance staff active account is required',
  })
  async waive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: WaiveAdminPractitionerRecoveryDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.waiveAdminPractitionerRecoveryUseCase.execute({
      recoveryId: id,
      body,
      operatorUserId: currentUser.id,
    });

    this.securityAuditService.logAsync({
      action: 'finance.practitioner-recovery.waive',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: currentUser.id,
      actorRoles: currentUser.roles,
      resourceType: 'PractitionerRecovery',
      resourceId: result.item.recoveryId,
      targetUserId: result.item.practitioner.practitionerId,
      metadata: {
        reason: body.reason,
        note: body.note ?? null,
        idempotencyKey: body.idempotencyKey,
      },
    });

    return {
      success: true as const,
      data: result,
    };
  }
}

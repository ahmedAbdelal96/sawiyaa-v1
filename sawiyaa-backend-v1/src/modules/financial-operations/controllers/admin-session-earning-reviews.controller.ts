import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { Permissions } from '@common/decorators/permissions.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SessionEarningReviewService } from '../services/session-earning-review.service';
import {
  ModerateSessionEarningReviewDto,
  SessionEarningReviewModerationAction,
} from '../dto/moderate-session-earning-review.dto';
import { RecordFinancialDecisionDto } from '../dto/record-financial-decision.dto';
import { CreditPractitionerWalletDto } from '../dto/credit-practitioner-wallet.dto';
import {
  AdminSessionEarningReviewDetailSuccessResponseDto,
  AdminSessionEarningReviewListSuccessResponseDto,
  ListAdminSessionEarningReviewsDto,
} from '../dto/admin-session-earning-reviews.dto';
import { GetAdminSessionEarningReviewUseCase } from '../use-cases/get-admin-session-earning-review.use-case';
import { ListAdminSessionEarningReviewsUseCase } from '../use-cases/list-admin-session-earning-reviews.use-case';

@ApiTags('Admin - Session Earning Reviews')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/finance/session-earning-reviews')
export class AdminSessionEarningReviewsController {
  constructor(
    private readonly sessionEarningReviewService: SessionEarningReviewService,
    private readonly listAdminSessionEarningReviewsUseCase: ListAdminSessionEarningReviewsUseCase,
    private readonly getAdminSessionEarningReviewUseCase: GetAdminSessionEarningReviewUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  @Get()
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'List session earning reviews for admin accounting',
    description:
      'Returns a paginated queue of session earning reviews with session, practitioner, payment, and accounting context.',
  })
  @ApiResponse({ status: 200, type: AdminSessionEarningReviewListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin, super admin, or finance staff active account is required',
  })
  async listReviews(@Query() query: ListAdminSessionEarningReviewsDto) {
    return this.listAdminSessionEarningReviewsUseCase.execute({ query });
  }

  @Get(':reviewId')
  @Permissions(PermissionKey.ACCOUNTING_READ)
  @ApiOperation({
    summary: 'Get one session earning review for admin accounting',
    description:
      'Returns session, payment, payout, refund, and ledger context for one earning review.',
  })
  @ApiResponse({
    status: 200,
    type: AdminSessionEarningReviewDetailSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiNotFoundResponse({ description: 'Session earning review was not found' })
  @ApiForbiddenResponse({
    description: 'Admin, super admin, or finance staff active account is required',
  })
  async getReview(@Param('reviewId', new ParseUUIDPipe()) reviewId: string) {
    return this.getAdminSessionEarningReviewUseCase.execute({ reviewId });
  }

  @Post(':reviewId/financial-decision')
  @Permissions(PermissionKey.FINANCIAL_SETTLEMENT_REVIEW)
  @ApiOperation({
    summary: 'Stage A: Record accountant financial decision and adjustment lines',
    description:
      'Approves or overrides base source amount and records relational adjustment lines. Produces ZERO wallet credit and ZERO ledger entries.',
  })
  @ApiResponse({ status: 200, description: 'Financial decision recorded' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'FINANCIAL_SETTLEMENT_REVIEW permission required',
  })
  async approveFinancialDecision(
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
    @Body() body: RecordFinancialDecisionDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.sessionEarningReviewService.approveFinancialDecision({
      reviewId,
      reviewerUserId: currentUser.id,
      actorRoles: currentUser.roles,
      accountantApprovedSourceAmount: body.accountantApprovedSourceAmount,
      overrideReason: body.overrideReason,
      adjustments: body.adjustments,
      internalReason: body.internalReason,
      practitionerFacingNote: body.practitionerFacingNote,
      idempotencyKey: body.idempotencyKey,
    });

    return {
      success: true as const,
      data: result,
    };
  }

  @Post(':reviewId/wallet-credit')
  @Permissions(PermissionKey.FINANCIAL_SETTLEMENT_APPROVE)
  @ApiOperation({
    summary: 'Stage B: Explicitly credit practitioner internal wallet',
    description:
      'Credits practitioner active wallet in wallet currency with FX conversion and posts PRACTITIONER_EARNING credit ledger entry. Produces ZERO external payout.',
  })
  @ApiResponse({ status: 200, description: 'Practitioner wallet credited' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'FINANCIAL_SETTLEMENT_APPROVE permission required',
  })
  async creditWallet(
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
    @Body() body: CreditPractitionerWalletDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.sessionEarningReviewService.creditPractitionerWallet({
      reviewId,
      approvedByUserId: currentUser.id,
      actorRoles: currentUser.roles,
      approvedWalletCreditAmount: body.approvedWalletCreditAmount,
      walletCreditDifferenceAmount: body.walletCreditDifferenceAmount,
      walletCreditOverrideReason: body.walletCreditOverrideReason,
      idempotencyKey: body.idempotencyKey,
    });

    return {
      success: true as const,
      data: result,
    };
  }

  @Patch(':reviewId/moderation')
  @Permissions(PermissionKey.FINANCIAL_SETTLEMENT_APPROVE)
  @ApiOperation({
    summary: 'Legacy moderation endpoint (Stage A + Stage B)',
    description:
      'Approves, edits, rejects, or excludes one session earning review.',
  })
  @ApiResponse({ status: 200, description: 'Moderation result' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Admin, super admin, or finance staff active account is required',
  })
  async moderateReview(
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
    @Body() body: ModerateSessionEarningReviewDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    if (
      body.action === SessionEarningReviewModerationAction.EDIT_AND_APPROVE &&
      (!body.finalPractitionerAmount?.trim() ||
        !body.finalPlatformAmount?.trim())
    ) {
      throw new BadRequestException({
        messageKey:
          'financialOperations.errors.sessionEarningReviewFinalAmountsRequired',
        error: 'FINANCIAL_OPERATIONS_SESSION_EARNING_REVIEW_FINAL_AMOUNTS_REQUIRED',
      });
    }

    if (
      body.action === SessionEarningReviewModerationAction.REJECT_PAYOUT ||
      body.action === SessionEarningReviewModerationAction.EXCLUDE_FROM_PAYOUT
    ) {
      if (!body.internalReason?.trim()) {
        throw new BadRequestException({
          messageKey:
            'financialOperations.errors.sessionEarningReviewReasonRequired',
          error: 'FINANCIAL_OPERATIONS_SESSION_EARNING_REVIEW_REASON_REQUIRED',
        });
      }
    }

    const result = body.action === SessionEarningReviewModerationAction.APPROVE_AS_IS || body.action === SessionEarningReviewModerationAction.EDIT_AND_APPROVE
      ? await this.sessionEarningReviewService.approveFinancialDecision({
          reviewId,
          reviewerUserId: currentUser.id,
          accountantApprovedSourceAmount: body.finalPractitionerAmount ?? null,
          overrideReason: body.internalReason ?? null,
          internalReason: body.internalReason ?? null,
          practitionerFacingNote: body.practitionerFacingNote ?? null,
          idempotencyKey: body.idempotencyKey,
        })
      : await this.sessionEarningReviewService.approveReview({
          reviewId,
          reviewerUserId: currentUser.id,
          action: body.action,
          finalPractitionerAmount: body.finalPractitionerAmount ?? null,
          finalPlatformAmount: body.finalPlatformAmount ?? null,
          finalCurrencyCode: body.finalCurrencyCode ?? null,
          exchangeRate: body.exchangeRate ?? null,
          accountingAdjustmentType: body.accountingAdjustmentType ?? null,
          accountingNotes: body.accountingNotes ?? null,
          internalReason: body.internalReason ?? null,
          practitionerFacingNote: body.practitionerFacingNote ?? null,
          postFinancialEffects: false,
          idempotencyKey: body.idempotencyKey,
        });

    this.securityAuditService.logAsync({
      action: 'finance.session-earning-review.moderation',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: currentUser.id,
      actorRoles: currentUser.roles,
      resourceType: 'SessionEarningReview',
      resourceId: reviewId,
      metadata: {
        action: body.action,
      },
    });

    return {
      success: true as const,
      data: result,
    };
  }
}

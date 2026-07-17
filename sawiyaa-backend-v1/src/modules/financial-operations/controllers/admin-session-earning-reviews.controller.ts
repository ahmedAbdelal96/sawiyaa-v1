import {
  BadRequestException,
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

  @Patch(':reviewId/moderation')
  @RequireStepUp('finance.session-earning-reviews.moderation')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({
    summary: 'Apply moderation to one session earning review',
    description:
      'Approves, edits, rejects, or excludes one session earning review and posts ledger entries only on approval.',
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

    const result = await this.sessionEarningReviewService.approveReview({
      reviewId,
      reviewerUserId: currentUser.id,
      action: body.action,
      finalPractitionerAmount: body.finalPractitionerAmount ?? null,
      finalPlatformAmount: body.finalPlatformAmount ?? null,
      finalCurrencyCode: body.finalCurrencyCode ?? null,
      internalReason: body.internalReason ?? null,
      practitionerFacingNote: body.practitionerFacingNote ?? null,
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

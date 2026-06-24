import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
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
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CalculateSessionFinancialBreakdownDto } from '../dto/calculate-session-financial-breakdown.dto';
import {
  CouponItemSuccessResponseDto,
  FinancialBreakdownItemSuccessResponseDto,
} from '../dto/financial-rules-response.dto';
import { ValidateCouponDto } from '../dto/validate-coupon.dto';
import { CalculateSessionFinancialBreakdownUseCase } from '../use-cases/calculate-session-financial-breakdown.use-case';
import { ValidateCouponUseCase } from '../use-cases/validate-coupon.use-case';

@ApiTags('Financial Rules')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@Roles(AppRole.PATIENT)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('patients/me/sessions')
export class PatientSessionFinancialRulesController {
  constructor(
    private readonly validateCouponUseCase: ValidateCouponUseCase,
    private readonly calculateSessionFinancialBreakdownUseCase: CalculateSessionFinancialBreakdownUseCase,
  ) {}

  @Post(':id/coupons/validate')
  @ApiOperation({
    summary: 'Validate coupon for a patient-owned session',
    description:
      'Validates coupon eligibility against the session payment context without consuming redemption usage yet.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiBody({ type: ValidateCouponDto })
  @ApiResponse({ status: 200, type: CouponItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Coupon is invalid, inactive, expired, or not applicable',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  @ApiNotFoundResponse({ description: 'Session or coupon was not found' })
  validateCoupon(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') sessionId: string,
    @Body() body: ValidateCouponDto,
  ) {
    return this.validateCouponUseCase.execute({
      userId: currentUser.id,
      sessionId,
      couponCode: body.couponCode,
    });
  }

  @Post(':id/financial-breakdown')
  @ApiOperation({
    summary: 'Calculate session financial breakdown',
    description:
      'Resolves gross price, optional coupon effect, commission split, and the final net paid amount for a patient-owned session.',
  })
  @ApiParam({ name: 'id', description: 'Session id' })
  @ApiBody({ type: CalculateSessionFinancialBreakdownDto })
  @ApiResponse({ status: 200, type: FinancialBreakdownItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Pricing, commission rules, or coupon resolution failed',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  @ApiNotFoundResponse({ description: 'Patient-owned session was not found' })
  calculateBreakdown(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') sessionId: string,
    @Body() body: CalculateSessionFinancialBreakdownDto,
  ) {
    return this.calculateSessionFinancialBreakdownUseCase.execute({
      userId: currentUser.id,
      sessionId,
      couponCode: body.couponCode ?? null,
    });
  }
}

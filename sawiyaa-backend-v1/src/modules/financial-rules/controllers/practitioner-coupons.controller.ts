import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
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
import {
  CreatePractitionerCouponDto,
  ListMyPractitionerCouponsDto,
  ListMyPractitionerCouponRedemptionsDto,
  UpdatePractitionerCouponDto,
} from '../dto/practitioner-coupon.dto';
import {
  PractitionerCouponItemSuccessResponseDto,
  PractitionerCouponListSuccessResponseDto,
  PractitionerCouponRedemptionListSuccessResponseDto,
} from '../dto/practitioner-coupon-response.dto';
import { CreateMyPractitionerCouponUseCase } from '../use-cases/create-my-practitioner-coupon.use-case';
import { DisableMyPractitionerCouponUseCase } from '../use-cases/disable-my-practitioner-coupon.use-case';
import { GetMyPractitionerCouponUseCase } from '../use-cases/get-my-practitioner-coupon.use-case';
import { ListMyPractitionerCouponRedemptionsUseCase } from '../use-cases/list-my-practitioner-coupon-redemptions.use-case';
import { ListMyPractitionerCouponsUseCase } from '../use-cases/list-my-practitioner-coupons.use-case';
import { UpdateMyPractitionerCouponUseCase } from '../use-cases/update-my-practitioner-coupon.use-case';

@ApiTags('Practitioner Coupons')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(
  AccountStateRequirement.ACTIVE_ACCOUNT,
  AccountStateRequirement.PRACTITIONER_OTP_VERIFIED,
  AccountStateRequirement.PRACTITIONER_APPROVED,
)
@Roles(AppRole.PRACTITIONER)
@Controller('practitioners/me/coupons')
export class PractitionerCouponsController {
  constructor(
    private readonly createMyPractitionerCouponUseCase: CreateMyPractitionerCouponUseCase,
    private readonly listMyPractitionerCouponsUseCase: ListMyPractitionerCouponsUseCase,
    private readonly getMyPractitionerCouponUseCase: GetMyPractitionerCouponUseCase,
    private readonly updateMyPractitionerCouponUseCase: UpdateMyPractitionerCouponUseCase,
    private readonly disableMyPractitionerCouponUseCase: DisableMyPractitionerCouponUseCase,
    private readonly listMyPractitionerCouponRedemptionsUseCase: ListMyPractitionerCouponRedemptionsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List my practitioner promo codes' })
  @ApiResponse({ status: 200, type: PractitionerCouponListSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only active OTP-verified practitioner accounts may manage promo codes',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListMyPractitionerCouponsDto,
  ) {
    return this.listMyPractitionerCouponsUseCase
      .execute({
        userId: currentUser.id,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        q: query.q,
        status: query.status,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post()
  @ApiOperation({ summary: 'Create my practitioner promo code' })
  @ApiBody({ type: CreatePractitionerCouponDto })
  @ApiResponse({ status: 201, type: PractitionerCouponItemSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Coupon payload is invalid' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only active OTP-verified practitioner accounts may manage promo codes',
  })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreatePractitionerCouponDto,
  ) {
    return this.createMyPractitionerCouponUseCase
      .execute({
        userId: currentUser.id,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get my practitioner promo code detail' })
  @ApiParam({ name: 'id', description: 'Coupon id' })
  @ApiResponse({ status: 200, type: PractitionerCouponItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only active OTP-verified practitioner accounts may manage promo codes',
  })
  @ApiNotFoundResponse({ description: 'Coupon was not found' })
  detail(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') couponId: string,
  ) {
    return this.getMyPractitionerCouponUseCase
      .execute({
        userId: currentUser.id,
        couponId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update my practitioner promo code' })
  @ApiParam({ name: 'id', description: 'Coupon id' })
  @ApiBody({ type: UpdatePractitionerCouponDto })
  @ApiResponse({ status: 200, type: PractitionerCouponItemSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Coupon payload is invalid' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only active OTP-verified practitioner accounts may manage promo codes',
  })
  @ApiNotFoundResponse({ description: 'Coupon was not found' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') couponId: string,
    @Body() body: UpdatePractitionerCouponDto,
  ) {
    return this.updateMyPractitionerCouponUseCase
      .execute({
        userId: currentUser.id,
        couponId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Disable my practitioner promo code' })
  @ApiParam({ name: 'id', description: 'Coupon id' })
  @ApiResponse({ status: 200, type: PractitionerCouponItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only active OTP-verified practitioner accounts may manage promo codes',
  })
  @ApiNotFoundResponse({ description: 'Coupon was not found' })
  disable(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') couponId: string,
  ) {
    return this.disableMyPractitionerCouponUseCase
      .execute({
        userId: currentUser.id,
        couponId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get(':id/redemptions')
  @ApiOperation({ summary: 'List my practitioner promo code redemptions' })
  @ApiParam({ name: 'id', description: 'Coupon id' })
  @ApiResponse({
    status: 200,
    type: PractitionerCouponRedemptionListSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Only active OTP-verified practitioner accounts may manage promo codes',
  })
  @ApiNotFoundResponse({ description: 'Coupon was not found' })
  listRedemptions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') couponId: string,
    @Query() query: ListMyPractitionerCouponRedemptionsDto,
  ) {
    return this.listMyPractitionerCouponRedemptionsUseCase
      .execute({
        userId: currentUser.id,
        couponId,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      })
      .then((data) => ({ success: true as const, data }));
  }
}

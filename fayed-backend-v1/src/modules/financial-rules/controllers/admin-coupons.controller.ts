import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CreateCouponDto } from '../dto/create-coupon.dto';
import { CouponItemSuccessResponseDto } from '../dto/financial-rules-response.dto';
import { CreateCouponUseCase } from '../use-cases/create-coupon.use-case';

@ApiTags('Admin - Coupons')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, AdminGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly createCouponUseCase: CreateCouponUseCase) {}

  @Post()
  @ApiOperation({
    summary: 'Create coupon',
    description:
      'Creates a baseline coupon record that can later be validated against session payments. Marketing campaign workflows remain outside this phase.',
  })
  @ApiBody({ type: CreateCouponDto })
  @ApiResponse({ status: 201, type: CouponItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Coupon configuration, scope, share split, or date range is invalid',
  })
  @ApiConflictResponse({ description: 'Coupon code already exists' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Admin active account is required' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: CreateCouponDto,
  ) {
    return this.createCouponUseCase.execute({
      createdByUserId: currentUser.id,
      ...body,
    });
  }
}

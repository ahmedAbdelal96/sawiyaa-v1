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
import { Roles } from '@common/decorators/roles.decorator';
import { AppRole } from '@common/enums/app-role.enum';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CreateCouponDto } from '../dto/create-coupon.dto';
import { CouponItemSuccessResponseDto } from '../dto/financial-rules-response.dto';
import { CreateCouponUseCase } from '../use-cases/create-coupon.use-case';

@ApiTags('Admin - Coupons')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(
  AppRole.ADMIN,
  AppRole.SUPER_ADMIN,
  AppRole.FINANCE_STAFF,
  AppRole.MARKETING_STAFF,
  AppRole.PRACTITIONER_REVIEWER,
  AppRole.PATIENT_OPERATIONS,
  AppRole.SUPPORT_AGENT,
  AppRole.CONTENT_REVIEWER,
)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly createCouponUseCase: CreateCouponUseCase) {}

  @Post()
  @Permissions(PermissionKey.COUPONS_MANAGE)
  @ApiOperation({
    summary: 'Create coupon',
    description:
      'Creates a baseline coupon record that can later be validated against session payments. Marketing campaign workflows remain outside this phase.',
  })
  @ApiBody({ type: CreateCouponDto })
  @ApiResponse({ status: 201, type: CouponItemSuccessResponseDto })
  @ApiBadRequestResponse({
    description:
      'Coupon configuration, scope, share split, or date range is invalid',
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

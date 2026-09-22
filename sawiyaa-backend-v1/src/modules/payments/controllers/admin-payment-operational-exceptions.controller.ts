import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  CreatePaymentOperationalExceptionDto,
  ListPaymentOperationalExceptionsDto,
  ResolvePaymentOperationalExceptionDto,
} from '../dto/payment-operational-exception.dto';
import { PaymentOperationalExceptionService } from '../services/payment-operational-exception.service';

@ApiTags('Admin - Payment Exceptions')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF)
@Controller('admin/payment-exceptions')
export class AdminPaymentOperationalExceptionsController {
  constructor(private readonly service: PaymentOperationalExceptionService) {}

  @Get()
  @Permissions(PermissionKey.FINANCE_EVENTS_READ)
  @ApiOperation({ summary: 'List payment investigation exceptions' })
  list(@Query() query: ListPaymentOperationalExceptionsDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @Permissions(PermissionKey.FINANCE_EVENTS_READ)
  @ApiOperation({ summary: 'Get one payment investigation exception' })
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.get(id);
  }

  @Post()
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({ summary: 'Open a payment investigation exception' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreatePaymentOperationalExceptionDto) {
    return this.service.create({ ...body, actorUserId: user.id, actorRoles: user.roles });
  }

  @Patch(':id')
  @Permissions(PermissionKey.ACCOUNTING_WRITE)
  @ApiOperation({ summary: 'Update a payment investigation exception' })
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ResolvePaymentOperationalExceptionDto,
  ) {
    return this.service.resolve({ ...body, id, actorUserId: user.id, actorRoles: user.roles });
  }
}

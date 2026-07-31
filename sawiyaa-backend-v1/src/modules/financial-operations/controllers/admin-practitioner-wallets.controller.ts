import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { GetAdminPractitionerWalletDto, ListAdminPractitionerWalletsDto } from '../dto/admin-practitioner-wallets.dto';
import { AdminPractitionerWalletReadService } from '../services/admin-practitioner-wallet-read.service';

@ApiTags('Admin - Practitioner Wallets')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.FINANCE_STAFF)
@Permissions(PermissionKey.PRACTITIONER_PAYOUTS_READ)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/practitioner-wallets')
export class AdminPractitionerWalletsController {
  constructor(private readonly readService: AdminPractitionerWalletReadService) {}

  @Get()
  @ApiOperation({ summary: 'List canonical practitioner wallet balances' })
  list(@Query() query: ListAdminPractitionerWalletsDto) { return this.readService.list(query); }

  @Get(':walletId')
  @ApiOperation({ summary: 'Get canonical practitioner wallet read-only detail' })
  detail(@Param('walletId', new ParseUUIDPipe()) walletId: string, @Query() query: GetAdminPractitionerWalletDto) { return this.readService.detail(walletId, query); }
}

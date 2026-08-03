import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { AdminPlatformSettingsService } from '../services/admin-platform-settings.service';
import {
  AdminPlatformSettingHistoryQueryDto,
  ListAdminPlatformSettingsDto,
  ResetAdminPlatformSettingDto,
  UpdateAdminPlatformSettingDto,
} from '../dto/admin-platform-settings.dto';

@Controller('admin/platform-settings')
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(
  AppRole.SUPER_ADMIN,
  AppRole.ADMIN,
  AppRole.FINANCE_STAFF,
  AppRole.MARKETING_STAFF,
  AppRole.PATIENT_OPERATIONS,
)
export class AdminPlatformSettingsController {
  constructor(
    private readonly service: AdminPlatformSettingsService,
    private readonly permissions: PermissionResolverService,
  ) {}

  @Get()
  @Permissions(PermissionKey.CONFIGURATION_VIEW)
  async list(
    @Query() query: ListAdminPlatformSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      data: await this.service.list(query, await this.resolve(actor)),
    };
  }

  @Patch(':key')
  @Permissions(PermissionKey.CONFIGURATION_VIEW)
  async update(
    @Param('key') key: string,
    @Body() body: UpdateAdminPlatformSettingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      data: await this.service.update(
        key,
        body,
        actor,
        await this.resolve(actor),
      ),
    };
  }

  @Patch(':key/reset')
  @Permissions(PermissionKey.CONFIGURATION_VIEW)
  async reset(
    @Param('key') key: string,
    @Body() body: ResetAdminPlatformSettingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      data: await this.service.reset(
        key,
        body,
        actor,
        await this.resolve(actor),
      ),
    };
  }

  @Get(':key/history')
  @Permissions(PermissionKey.CONFIGURATION_HISTORY_VIEW)
  async history(
    @Param('key') key: string,
    @Query() query: AdminPlatformSettingHistoryQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      data: await this.service.history(
        key,
        query.page,
        query.limit,
        await this.resolve(actor),
      ),
    };
  }

  private resolve(actor: AuthenticatedUser) {
    return this.permissions.resolvePermissions({
      userId: actor.id,
      roles: actor.roles,
    });
  }
}

import {
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
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RequireStepUp } from '@common/decorators/step-up.decorator';
import { ThrottlePolicy } from '@common/decorators/throttle-policy.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CreateAdminUserDto } from '../dto/create-admin-user.dto';
import { ListAdminUsersDto } from '../dto/list-admin-users.dto';
import { PatchAdminUserDto } from '../dto/patch-admin-user.dto';
import { UpdateAdminUserPermissionOverridesDto } from '../dto/update-admin-user-permission-overrides.dto';
import { UpdateAdminUserRolesDto } from '../dto/update-admin-user-roles.dto';
import { UpdateAdminUserStatusDto } from '../dto/update-admin-user-status.dto';
import {
  AdminUserDetailsSuccessResponseDto,
  AdminUserMutationSuccessResponseDto,
  AdminUserPermissionOverridesListSuccessResponseDto,
  AdminUsersListResponseDto,
} from '../dto/admin-user-response.dto';
import { CreateAdminUserUseCase } from '../use-cases/create-admin-user.use-case';
import { GetAdminUserUseCase } from '../use-cases/get-admin-user.use-case';
import { InvalidateAdminUserTokensUseCase } from '../use-cases/invalidate-admin-user-tokens.use-case';
import { ListAdminUserPermissionOverridesUseCase } from '../use-cases/list-admin-user-permission-overrides.use-case';
import { ListAdminUsersUseCase } from '../use-cases/list-admin-users.use-case';
import { PatchAdminUserUseCase } from '../use-cases/patch-admin-user.use-case';
import { RevokeAdminUserSessionsUseCase } from '../use-cases/revoke-admin-user-sessions.use-case';
import { UpdateAdminUserPermissionOverridesUseCase } from '../use-cases/update-admin-user-permission-overrides.use-case';
import { UpdateAdminUserRolesUseCase } from '../use-cases/update-admin-user-roles.use-case';
import { UpdateAdminUserStatusUseCase } from '../use-cases/update-admin-user-status.use-case';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(
  AppRole.SUPER_ADMIN,
  AppRole.ADMIN,
  AppRole.FINANCE_STAFF,
  AppRole.MARKETING_STAFF,
  AppRole.PRACTITIONER_REVIEWER,
  AppRole.PATIENT_OPERATIONS,
  AppRole.SUPPORT_AGENT,
  AppRole.CONTENT_REVIEWER,
)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly listAdminUsersUseCase: ListAdminUsersUseCase,
    private readonly getAdminUserUseCase: GetAdminUserUseCase,
    private readonly createAdminUserUseCase: CreateAdminUserUseCase,
    private readonly patchAdminUserUseCase: PatchAdminUserUseCase,
    private readonly updateAdminUserStatusUseCase: UpdateAdminUserStatusUseCase,
    private readonly updateAdminUserRolesUseCase: UpdateAdminUserRolesUseCase,
    private readonly listPermissionOverridesUseCase: ListAdminUserPermissionOverridesUseCase,
    private readonly updatePermissionOverridesUseCase: UpdateAdminUserPermissionOverridesUseCase,
    private readonly revokeSessionsUseCase: RevokeAdminUserSessionsUseCase,
    private readonly invalidateTokensUseCase: InvalidateAdminUserTokensUseCase,
  ) {}

  @Get()
  @Permissions(PermissionKey.ADMIN_USERS_READ)
  @ApiOperation({ summary: 'List internal platform users (admin/staff)' })
  @ApiResponse({ status: 200, type: AdminUsersListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Route requires admin permission' })
  list(
    @Query() query: ListAdminUsersDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.listAdminUsersUseCase.execute({ locale, query });
  }

  @Get(':id')
  @Permissions(PermissionKey.ADMIN_USERS_READ)
  @ApiOperation({ summary: 'Get internal user details' })
  @ApiParam({ name: 'id', description: 'Internal user id' })
  @ApiResponse({ status: 200, type: AdminUserDetailsSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Route requires admin permission' })
  @ApiNotFoundResponse({ description: 'Internal user not found' })
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getAdminUserUseCase.execute({ locale, userId: id });
  }

  @Post()
  @ThrottlePolicy('admin-users-create')
  @RequireStepUp('security.adminUsers.create')
  @Permissions(PermissionKey.ADMIN_USERS_CREATE)
  @ApiOperation({ summary: 'Create an internal platform user (admin/staff)' })
  @ApiBody({ type: CreateAdminUserDto })
  @ApiResponse({ status: 201, type: AdminUserMutationSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Route requires admin permission' })
  create(
    @Body() body: CreateAdminUserDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.createAdminUserUseCase.execute({
      locale,
      actor,
      payload: body,
    });
  }

  @Patch(':id')
  @ThrottlePolicy('admin-users-sensitive-mutation')
  @RequireStepUp('security.adminUsers.update')
  @Permissions(PermissionKey.ADMIN_USERS_UPDATE)
  @ApiOperation({ summary: 'Update internal user profile basics' })
  @ApiParam({ name: 'id', description: 'Internal user id' })
  @ApiBody({ type: PatchAdminUserDto })
  @ApiResponse({ status: 200, type: AdminUserMutationSuccessResponseDto })
  patch(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: PatchAdminUserDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.patchAdminUserUseCase.execute({
      locale,
      actor,
      userId: id,
      payload: body,
    });
  }

  @Patch(':id/status')
  @ThrottlePolicy('admin-users-sensitive-mutation')
  @RequireStepUp('security.adminUsers.status.update')
  @Permissions(PermissionKey.ADMIN_USERS_STATUS_UPDATE)
  @ApiOperation({ summary: 'Update internal user status (enable/disable)' })
  @ApiParam({ name: 'id', description: 'Internal user id' })
  @ApiBody({ type: UpdateAdminUserStatusDto })
  @ApiResponse({ status: 200, type: AdminUserMutationSuccessResponseDto })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateAdminUserStatusDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.updateAdminUserStatusUseCase.execute({
      locale,
      actor,
      userId: id,
      status: body.status,
      reason: body.reason,
    });
  }

  @Patch(':id/roles')
  @ThrottlePolicy('admin-users-sensitive-mutation')
  @RequireStepUp('security.adminUsers.roles.update')
  @Permissions(PermissionKey.ADMIN_USERS_ROLES_UPDATE)
  @ApiOperation({ summary: 'Update internal user roles' })
  @ApiParam({ name: 'id', description: 'Internal user id' })
  @ApiBody({ type: UpdateAdminUserRolesDto })
  @ApiResponse({ status: 200, type: AdminUserMutationSuccessResponseDto })
  updateRoles(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateAdminUserRolesDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.updateAdminUserRolesUseCase.execute({
      locale,
      actor,
      userId: id,
      roles: body.roles,
      reason: body.reason,
    });
  }

  @Get(':id/permission-overrides')
  @Permissions(PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_READ)
  @ApiOperation({ summary: 'List permission overrides for an internal user' })
  @ApiParam({ name: 'id', description: 'Internal user id' })
  @ApiResponse({
    status: 200,
    type: AdminUserPermissionOverridesListSuccessResponseDto,
  })
  listPermissionOverrides(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.listPermissionOverridesUseCase.execute({ locale, userId: id });
  }

  @Patch(':id/permission-overrides')
  @ThrottlePolicy('admin-users-sensitive-mutation')
  @RequireStepUp('security.adminUsers.permissionOverrides.update')
  @Permissions(PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_UPDATE)
  @ApiOperation({ summary: 'Update permission overrides for an internal user' })
  @ApiParam({ name: 'id', description: 'Internal user id' })
  @ApiBody({ type: UpdateAdminUserPermissionOverridesDto })
  @ApiResponse({ status: 200, type: AdminUserMutationSuccessResponseDto })
  updatePermissionOverrides(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateAdminUserPermissionOverridesDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.updatePermissionOverridesUseCase.execute({
      locale,
      actor,
      userId: id,
      operations: body.operations,
    });
  }

  @Post(':id/sessions/revoke')
  @ThrottlePolicy('admin-users-sensitive-mutation')
  @RequireStepUp('security.adminUsers.sessions.revoke')
  @Permissions(PermissionKey.ADMIN_USERS_SESSIONS_REVOKE)
  @ApiOperation({ summary: 'Revoke all active sessions for an internal user' })
  @ApiParam({ name: 'id', description: 'Internal user id' })
  @ApiResponse({ status: 200, type: AdminUserMutationSuccessResponseDto })
  revokeSessions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.revokeSessionsUseCase.execute({ locale, actor, userId: id });
  }

  @Post(':id/token-version/invalidate')
  @ThrottlePolicy('admin-users-sensitive-mutation')
  @RequireStepUp('security.adminUsers.tokenVersion.invalidate')
  @Permissions(PermissionKey.ADMIN_USERS_TOKEN_VERSION_INVALIDATE)
  @ApiOperation({
    summary:
      'Invalidate tokens for an internal user (bump tokenVersion + revoke sessions)',
  })
  @ApiParam({ name: 'id', description: 'Internal user id' })
  @ApiResponse({ status: 200, type: AdminUserMutationSuccessResponseDto })
  invalidateTokens(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.invalidateTokensUseCase.execute({ locale, actor, userId: id });
  }
}

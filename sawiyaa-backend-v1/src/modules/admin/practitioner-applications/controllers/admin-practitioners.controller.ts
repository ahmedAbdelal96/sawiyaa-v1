import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { AdminPractitionerAvatarSuccessResponseDto } from '../dto/admin-practitioner-avatar-response.dto';
import { ListAdminPractitionersDto } from '../dto/list-admin-practitioners.dto';
import { UpsertAdminPractitionerAvatarDto } from '../dto/upsert-admin-practitioner-avatar.dto';
import { ClearPractitionerAuthLockoutUseCase } from '../use-cases/clear-practitioner-auth-lockout.use-case';
import { RemoveAdminPractitionerAvatarUseCase } from '../use-cases/remove-admin-practitioner-avatar.use-case';
import { ListAdminPractitionersDirectoryUseCase } from '../use-cases/list-admin-practitioners-directory.use-case';
import { UpdateAdminPractitionerAvatarUseCase } from '../use-cases/update-admin-practitioner-avatar.use-case';
import { GetAdminPractitionerAvatarFileUseCase } from '../use-cases/get-admin-practitioner-avatar-file.use-case';
import { ManagePractitionerPublicationUseCase } from '../use-cases/manage-practitioner-publication.use-case';
import { UpdatePractitionerPublicationDto } from '../dto/update-practitioner-publication.dto';
import {
  PractitionerPublicationSuccessResponseDto,
  PractitionerPublicationResponseDto,
} from '../dto/practitioner-publication-response.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { RequireStepUp } from '@common/decorators/step-up.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PermissionKey } from '@common/enums/permission-key.enum';

/**
 * Admin practitioner directory controller.
 * This endpoint intentionally does not depend on public listing visibility constraints.
 */
@ApiTags('Admin - Practitioners')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, AdminGuard, PermissionsGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/practitioners')
export class AdminPractitionersController {
  constructor(
    private readonly listAdminPractitionersDirectoryUseCase: ListAdminPractitionersDirectoryUseCase,
    private readonly updateAdminPractitionerAvatarUseCase: UpdateAdminPractitionerAvatarUseCase,
    private readonly removeAdminPractitionerAvatarUseCase: RemoveAdminPractitionerAvatarUseCase,
    private readonly clearPractitionerAuthLockoutUseCase: ClearPractitionerAuthLockoutUseCase,
    private readonly getAdminPractitionerAvatarFileUseCase: GetAdminPractitionerAvatarFileUseCase,
    private readonly managePractitionerPublicationUseCase: ManagePractitionerPublicationUseCase,
  ) {}

  @Get(':id/publication')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_READ)
  @ApiOperation({ summary: 'Get practitioner publication state and readiness' })
  @ApiResponse({ status: 200, type: PractitionerPublicationResponseDto })
  getPublication(@Param('id') id: string) {
    return this.managePractitionerPublicationUseCase.get({
      practitionerId: id,
    });
  }

  @Patch(':id/publication')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE)
  @RequireStepUp('security.practitioner.publication.update')
  @ApiOperation({ summary: 'Publish or unpublish a practitioner profile' })
  @ApiResponse({ status: 200, type: PractitionerPublicationSuccessResponseDto })
  updatePublication(
    @Param('id') id: string,
    @Body() body: UpdatePractitionerPublicationDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.managePractitionerPublicationUseCase.update({
      practitionerId: id,
      actorUserId: user.id,
      locale,
      isPublished: body.isPublished,
      reason: body.reason,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List practitioners for admin directory',
    description:
      'Admin-only practitioner directory with operational filters. This surface is independent from public profile publication constraints.',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'practitionerKind', required: false })
  @ApiQuery({ name: 'gender', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'onlineNow', required: false })
  @ApiQuery({ name: 'minRating', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    description: 'Practitioners fetched successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid filter or pagination values' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Route requires active admin account' })
  list(
    @Query() query: ListAdminPractitionersDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.listAdminPractitionersDirectoryUseCase.execute({
      locale,
      search: query.search,
      practitionerKind: query.practitionerKind,
      gender: query.gender,
      country: query.country,
      onlineNow: query.onlineNow,
      minRating: query.minRating,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id/avatar')
  @ApiOperation({
    summary: 'Get practitioner avatar from admin scope',
    description:
      'Returns only the stored avatar image for an admin-visible practitioner.',
  })
  @ApiResponse({ status: 200, description: 'Avatar image stream' })
  @ApiNotFoundResponse({ description: 'Practitioner or avatar not found' })
  async avatar(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const avatar = await this.getAdminPractitionerAvatarFileUseCase.execute(id);
    response.setHeader('Content-Type', avatar.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    return new StreamableFile(createReadStream(avatar.absolutePath));
  }

  @Patch(':id/avatar')
  @ApiOperation({
    summary: 'Update practitioner avatar from admin scope',
    description:
      'Stores practitioner avatar URL for one practitioner profile. This endpoint updates metadata only and does not handle binary file uploads.',
  })
  @ApiResponse({ status: 200, type: AdminPractitionerAvatarSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Route requires active admin account' })
  @ApiNotFoundResponse({ description: 'Practitioner profile not found' })
  updateAvatar(
    @Param('id') id: string,
    @Body() body: UpsertAdminPractitionerAvatarDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.updateAdminPractitionerAvatarUseCase.execute({
      practitionerId: id,
      avatarUrl: body.avatarUrl,
      locale,
    });
  }

  @Delete(':id/avatar')
  @ApiOperation({
    summary: 'Remove practitioner avatar from admin scope',
    description:
      'Clears practitioner avatar URL for one practitioner profile. This endpoint does not delete files from storage providers.',
  })
  @ApiResponse({ status: 200, type: AdminPractitionerAvatarSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Route requires active admin account' })
  @ApiNotFoundResponse({ description: 'Practitioner profile not found' })
  removeAvatar(
    @Param('id') id: string,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.removeAdminPractitionerAvatarUseCase.execute({
      practitionerId: id,
      locale,
    });
  }

  @Post(':id/auth-lockout/clear')
  @ApiOperation({
    summary: 'Clear practitioner auth lockout',
    description:
      'Clears temporary lockout state for practitioner password login and OTP verification without changing account status.',
  })
  @ApiResponse({ status: 200 })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Route requires active admin account' })
  @ApiNotFoundResponse({ description: 'Practitioner profile not found' })
  clearAuthLockout(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.clearPractitionerAuthLockoutUseCase.execute({
      practitionerId: id,
      actorUserId: request.user!.id,
      locale,
      ipAddress: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
      correlationId: request.requestId ?? null,
    });
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequireStepUp } from '@common/decorators/step-up.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { AppRole } from '@common/enums/app-role.enum';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ApprovePractitionerApplicationDto } from '../dto/approve-practitioner-application.dto';
import { CreateAdminPractitionerDto } from '../dto/create-admin-practitioner.dto';
import { UploadAdminPractitionerCredentialFileDto } from '../dto/upload-admin-practitioner-credential-file.dto';
import { ListPractitionerApplicationsDto } from '../dto/list-practitioner-applications.dto';
import {
  AdminDirectPractitionerCreateSuccessResponseDto,
  AdminPreparedPractitionerCredentialSuccessResponseDto,
  PractitionerApplicationDecisionSuccessResponseDto,
  PractitionerApplicationCredentialSuccessResponseDto,
  PractitionerApplicationCredentialDeleteSuccessResponseDto,
  PractitionerApplicationDetailsSuccessResponseDto,
  PractitionerApplicationListSuccessResponseDto,
} from '../dto/practitioner-application-list-item-response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { RejectPractitionerApplicationDto } from '../dto/reject-practitioner-application.dto';
import { RequestPractitionerApplicationChangesDto } from '../dto/request-practitioner-application-changes.dto';
import { UpdatePractitionerApplicationDraftDto } from '../dto/update-practitioner-application-draft.dto';
import {
  CreatePractitionerApplicationCredentialDto,
  UpdatePractitionerApplicationCredentialDto,
} from '../dto/upsert-practitioner-application-credential.dto';
import { ApprovePractitionerApplicationUseCase } from '../use-cases/approve-practitioner-application.use-case';
import { CreateAdminPractitionerUseCase } from '../use-cases/create-admin-practitioner.use-case';
import { GetPractitionerApplicationDetailsUseCase } from '../use-cases/get-practitioner-application-details.use-case';
import { ListPractitionerApplicationsUseCase } from '../use-cases/list-practitioner-applications.use-case';
import { RejectPractitionerApplicationUseCase } from '../use-cases/reject-practitioner-application.use-case';
import { RequestPractitionerApplicationChangesUseCase } from '../use-cases/request-practitioner-application-changes.use-case';
import { UpsertPractitionerApplicationCredentialUseCase } from '../use-cases/upsert-practitioner-application-credential.use-case';
import { DeletePractitionerApplicationCredentialUseCase } from '../use-cases/delete-practitioner-application-credential.use-case';
import { UpdatePractitionerApplicationDraftUseCase } from '../use-cases/update-practitioner-application-draft.use-case';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import { GetPractitionerApplicationAvatarFileUseCase } from '../use-cases/get-practitioner-application-avatar-file.use-case';
import { GetPractitionerApplicationCredentialFileUseCase } from '../use-cases/get-practitioner-application-credential-file.use-case';
import { UploadAdminPractitionerCredentialFileUseCase } from '../use-cases/upload-admin-practitioner-credential-file.use-case';

/**
 * Admin-only controller for practitioner application review decisions.
 * This scope is intentionally isolated from practitioner self-service profile/application endpoints.
 */
@ApiTags('Admin - Practitioner Applications')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, PermissionsGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN, AppRole.PRACTITIONER_REVIEWER)
@Controller('admin/practitioner-applications')
export class PractitionerApplicationsAdminController {
  constructor(
    private readonly listPractitionerApplicationsUseCase: ListPractitionerApplicationsUseCase,
    private readonly getPractitionerApplicationDetailsUseCase: GetPractitionerApplicationDetailsUseCase,
    private readonly getPractitionerApplicationAvatarFileUseCase: GetPractitionerApplicationAvatarFileUseCase,
    private readonly getPractitionerApplicationCredentialFileUseCase: GetPractitionerApplicationCredentialFileUseCase,
    private readonly approvePractitionerApplicationUseCase: ApprovePractitionerApplicationUseCase,
    private readonly rejectPractitionerApplicationUseCase: RejectPractitionerApplicationUseCase,
    private readonly requestPractitionerApplicationChangesUseCase: RequestPractitionerApplicationChangesUseCase,
    private readonly createAdminPractitionerUseCase: CreateAdminPractitionerUseCase,
    private readonly updatePractitionerApplicationDraftUseCase: UpdatePractitionerApplicationDraftUseCase,
    private readonly upsertPractitionerApplicationCredentialUseCase: UpsertPractitionerApplicationCredentialUseCase,
    private readonly deletePractitionerApplicationCredentialUseCase: DeletePractitionerApplicationCredentialUseCase,
    private readonly uploadAdminPractitionerCredentialFileUseCase: UploadAdminPractitionerCredentialFileUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  /**
   * Streams the practitioner's avatar for admin review.
   * This is intentionally scoped under the application id to avoid exposing raw storage paths.
   */
  @Get(':id/avatar')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_READ)
  @ApiOperation({
    summary: 'Get practitioner avatar file for application review',
  })
  @ApiParam({ name: 'id', description: 'Practitioner application id' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Route requires admin permissions' })
  @ApiNotFoundResponse({ description: 'Avatar or application not found' })
  async getAvatarFile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const stored = await this.getPractitionerApplicationAvatarFileUseCase.execute(
      { applicationId: id },
    );

    res.setHeader('Content-Type', stored.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=60');
    return new StreamableFile(createReadStream(stored.absolutePath));
  }

  /**
   * Streams one credential/document file for admin review.
   * Files are sensitive; this endpoint is authenticated and verified against the application practitioner id.
   */
  @Get(':id/credentials/:credentialId/file')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_READ)
  @ApiOperation({
    summary: 'Get practitioner credential file for application review',
  })
  @ApiParam({ name: 'id', description: 'Practitioner application id' })
  @ApiParam({ name: 'credentialId', description: 'Credential id' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({ description: 'Route requires admin permissions' })
  @ApiNotFoundResponse({ description: 'Credential or file not found' })
  async getCredentialFile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('credentialId', new ParseUUIDPipe()) credentialId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const stored =
      await this.getPractitionerApplicationCredentialFileUseCase.execute({
        applicationId: id,
        credentialId,
      });

    res.setHeader('Content-Type', stored.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=60');
    return new StreamableFile(createReadStream(stored.absolutePath));
  }

  /** Lists practitioner applications for admin queues with optional status/search filters. */
  @Get()
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_READ)
  @ApiOperation({
    summary: 'List practitioner applications for review',
    description:
      'Admin-only listing endpoint for practitioner applications with lightweight status and display-name filtering.',
  })
  @ApiQuery({ name: 'kind', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    type: PractitionerApplicationListSuccessResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid filter or pagination values' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Route requires active admin account',
  })
  list(
    @Query() query: ListPractitionerApplicationsDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.listPractitionerApplicationsUseCase.execute({
      locale,
      kind: query.kind,
      status: query.status,
      q: query.q,
      page: query.page,
      limit: query.limit,
    });
  }

  /** Creates a practitioner account directly from admin scope without practitioner self-submission. */
  @Post('direct-create')
  @RequireStepUp('security.practitioner.application.direct-create')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE)
  @ApiOperation({
    summary: 'Create practitioner directly (admin)',
    description:
      'Creates practitioner auth/account/profile baseline directly from admin scope, marks practitioner + application approved, and bypasses self-submitted onboarding application flow.',
  })
  @ApiBody({ type: CreateAdminPractitionerDto })
  @ApiResponse({
    status: 201,
    type: AdminDirectPractitionerCreateSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid payload or country code is unknown/inactive',
  })
  @ApiConflictResponse({
    description: 'Email is already registered',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Route requires active admin account',
  })
  createDirect(
    @Body() body: CreateAdminPractitionerDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.createAdminPractitionerUseCase
      .execute({
        locale,
        adminUserId: currentUser.id,
        email: body.email,
        password: body.password,
        displayName: body.displayName,
        practitionerType: body.practitionerType,
        practitionerGender: body.practitionerGender,
        professionalTitle: body.professionalTitle,
        bio: body.bio,
        yearsOfExperience: body.yearsOfExperience,
        sessionPrice30Egp: body.sessionPrice30Egp,
        sessionPrice30Usd: body.sessionPrice30Usd,
        sessionPrice60Egp: body.sessionPrice60Egp,
        sessionPrice60Usd: body.sessionPrice60Usd,
        countryCode: body.countryCode,
        languageCodes: body.languageCodes,
        specialtySelection: body.specialtySelection,
        payoutDestination: body.payoutDestination,
        credentials: body.credentials,
        note: body.note,
      });
  }

  /** Uploads a credential file for later inclusion in admin direct-create payloads. */
  @Post('direct-create/credentials/upload')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary: 'Upload direct-create practitioner credential file',
    description:
      'Uploads a credential file to managed storage so admin direct practitioner creation can reference a safe internal file URL instead of a raw external link.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        credentialType: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
      },
      required: ['file', 'credentialType'],
    },
  })
  @ApiResponse({
    status: 201,
    type: AdminPreparedPractitionerCredentialSuccessResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid file, type, or payload' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Route requires active admin account',
  })
  uploadDirectCredential(
    @CurrentLocale() locale: SupportedLocale,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
        }
      | undefined,
    @Body() body: UploadAdminPractitionerCredentialFileDto,
  ) {
    return this.uploadAdminPractitionerCredentialFileUseCase.execute({
      locale,
      credentialType: body.credentialType,
      expiresAt:
        body.expiresAt === undefined
          ? undefined
          : body.expiresAt === null
            ? null
            : new Date(body.expiresAt),
      file,
    });
  }

  /** Returns full admin details for one practitioner application. */
  @Get(':id')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_READ)
  @ApiOperation({
    summary: 'Get practitioner application details',
    description:
      'Admin-only details endpoint aggregating applicant basics, submitted profile truth, specialties, credentials, payout destination, application review summary, and readiness snapshot.',
  })
  @ApiParam({ name: 'id', description: 'Practitioner application id' })
  @ApiResponse({
    status: 200,
    type: PractitionerApplicationDetailsSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Route requires active admin account',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner application was not found',
  })
  details(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getPractitionerApplicationDetailsUseCase.execute({
      id,
      locale,
    });
  }

  /** Allows admin to amend practitioner submitted data before final decision. */
  @Patch(':id')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE)
  @ApiOperation({
    summary: 'Update practitioner application draft data',
    description:
      'Admin-only amendment endpoint for practitioner profile/specialty/payout fields before approve/reject.',
  })
  @ApiParam({ name: 'id', description: 'Practitioner application id' })
  @ApiBody({ type: UpdatePractitionerApplicationDraftDto })
  @ApiResponse({
    status: 200,
    type: PractitionerApplicationDecisionSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload is invalid or contains invalid linked values',
  })
  @ApiConflictResponse({
    description:
      'Application is already approved/archived and cannot be edited',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Route requires active admin account',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner application was not found',
  })
  updateDraft(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdatePractitionerApplicationDraftDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.updatePractitionerApplicationDraftUseCase.execute({
      id,
      locale,
      adminUserId: currentUser.id,
      data: body,
    });
  }

  /** Adds one practitioner credential from admin review details scope. */
  @Post(':id/credentials')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE)
  @ApiOperation({
    summary: 'Add practitioner credential in application review',
    description:
      'Admin-only endpoint to append one practitioner credential metadata item while reviewing an application.',
  })
  @ApiParam({ name: 'id', description: 'Practitioner application id' })
  @ApiBody({ type: CreatePractitionerApplicationCredentialDto })
  @ApiResponse({
    status: 201,
    type: PractitionerApplicationCredentialSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload is invalid for credential create',
  })
  @ApiConflictResponse({
    description:
      'Application is approved/archived and cannot accept credential edits',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Route requires active admin account',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner application was not found',
  })
  createCredential(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreatePractitionerApplicationCredentialDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.upsertPractitionerApplicationCredentialUseCase.execute({
      applicationId: id,
      locale,
      adminUserId: currentUser.id,
      data: body,
    });
  }

  /** Updates one practitioner credential from admin review details scope. */
  @Patch(':id/credentials/:credentialId')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE)
  @ApiOperation({
    summary: 'Update practitioner credential in application review',
    description:
      'Admin-only endpoint to amend credential metadata/review status/notes while reviewing an application.',
  })
  @ApiParam({ name: 'id', description: 'Practitioner application id' })
  @ApiParam({ name: 'credentialId', description: 'Practitioner credential id' })
  @ApiBody({ type: UpdatePractitionerApplicationCredentialDto })
  @ApiResponse({
    status: 200,
    type: PractitionerApplicationCredentialSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Payload is invalid for credential update',
  })
  @ApiConflictResponse({
    description:
      'Application is approved/archived and cannot accept credential edits',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Route requires active admin account',
  })
  @ApiNotFoundResponse({
    description:
      'Practitioner application or credential was not found for this application',
  })
  updateCredential(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('credentialId', new ParseUUIDPipe()) credentialId: string,
    @Body() body: UpdatePractitionerApplicationCredentialDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.upsertPractitionerApplicationCredentialUseCase.execute({
      applicationId: id,
      credentialId,
      locale,
      adminUserId: currentUser.id,
      data: body,
    });
  }

  /** Deletes one practitioner credential from admin review details scope. */
  @Delete(':id/credentials/:credentialId')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE)
  @ApiOperation({
    summary: 'Delete practitioner credential in application review',
    description:
      'Admin-only endpoint to remove one credential from practitioner application review scope.',
  })
  @ApiParam({ name: 'id', description: 'Practitioner application id' })
  @ApiParam({ name: 'credentialId', description: 'Practitioner credential id' })
  @ApiResponse({
    status: 200,
    type: PractitionerApplicationCredentialDeleteSuccessResponseDto,
  })
  @ApiConflictResponse({
    description:
      'Application is approved/archived and cannot accept credential edits',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Route requires active admin account',
  })
  @ApiNotFoundResponse({
    description:
      'Practitioner application or credential was not found for this application',
  })
  deleteCredential(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('credentialId', new ParseUUIDPipe()) credentialId: string,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.deletePractitionerApplicationCredentialUseCase.execute({
      applicationId: id,
      credentialId,
      locale,
      adminUserId: currentUser.id,
    });
  }

  /** Approves a practitioner application when transition policy allows it. */
  @Post(':id/approve')
  @RequireStepUp('security.practitioner.application.approve')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE)
  @ApiOperation({
    summary: 'Approve practitioner application',
    description:
      'Admin-only decision endpoint. Approves submitted/under-review applications, updates application + practitioner profile states in one transaction, and blocks duplicate/invalid transitions with conflict or bad-request responses.',
  })
  @ApiParam({ name: 'id', description: 'Practitioner application id' })
  @ApiBody({ type: ApprovePractitionerApplicationDto })
  @ApiResponse({
    status: 200,
    type: PractitionerApplicationDecisionSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Application is in a non-reviewable state, or practitioner readiness is not sufficient for approval',
  })
  @ApiConflictResponse({
    description: 'Application is already approved or already rejected',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Route requires active admin account',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner application was not found',
  })
  approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ApprovePractitionerApplicationDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.approvePractitionerApplicationUseCase.execute({
        id,
        locale,
        adminUserId: currentUser.id,
        operatorRoles: currentUser.roles,
        reason: body.reason,
        note: body.note,
      });
  }

  /** Rejects a practitioner application when transition policy allows it. */
  @Post(':id/reject')
  @RequireStepUp('security.practitioner.application.reject')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_REJECT)
  @ApiOperation({
    summary: 'Reject practitioner application',
    description:
      'Admin-only decision endpoint. Rejects submitted/under-review applications and requires a clear rejection reason for baseline auditability. Duplicate/invalid transitions are blocked with conflict or bad-request responses.',
  })
  @ApiParam({ name: 'id', description: 'Practitioner application id' })
  @ApiBody({ type: RejectPractitionerApplicationDto })
  @ApiResponse({
    status: 200,
    type: PractitionerApplicationDecisionSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Application is in a non-reviewable state or reject body is invalid',
  })
  @ApiConflictResponse({
    description: 'Application is already rejected or already approved',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Route requires active admin account',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner application was not found',
  })
  reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: RejectPractitionerApplicationDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rejectPractitionerApplicationUseCase.execute({
        id,
        locale,
        adminUserId: currentUser.id,
        operatorRoles: currentUser.roles,
        reason: body.reason,
        note: body.note,
      });
  }

  /** Requests changes for a practitioner application (editable again). */
  @Post(':id/request-changes')
  @RequireStepUp('security.practitioner.application.request-changes')
  @Permissions(PermissionKey.PRACTITIONER_APPLICATIONS_REQUEST_CHANGES)
  @ApiOperation({
    summary: 'Request changes for practitioner application',
    description:
      'Admin-only decision endpoint. Marks the application as CHANGES_REQUESTED so the practitioner can edit and resubmit.',
  })
  @ApiParam({ name: 'id', description: 'Practitioner application id' })
  @ApiBody({ type: RequestPractitionerApplicationChangesDto })
  @ApiResponse({
    status: 200,
    type: PractitionerApplicationDecisionSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Application is in a non-reviewable state or body is invalid',
  })
  @ApiConflictResponse({
    description:
      'Application is already approved/rejected or already changes requested',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Route requires active admin account',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner application was not found',
  })
  requestChanges(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: RequestPractitionerApplicationChangesDto,
    @CurrentLocale() locale: SupportedLocale,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.requestPractitionerApplicationChangesUseCase.execute({
      id,
      locale,
      adminUserId: currentUser.id,
      reason: body.reason,
      note: body.note,
    });
  }
}

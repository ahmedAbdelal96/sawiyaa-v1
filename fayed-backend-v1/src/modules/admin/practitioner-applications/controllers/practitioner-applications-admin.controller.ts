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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ApprovePractitionerApplicationDto } from '../dto/approve-practitioner-application.dto';
import { CreateAdminPractitionerDto } from '../dto/create-admin-practitioner.dto';
import { ListPractitionerApplicationsDto } from '../dto/list-practitioner-applications.dto';
import {
  PractitionerApplicationDecisionSuccessResponseDto,
  PractitionerApplicationCredentialSuccessResponseDto,
  PractitionerApplicationCredentialDeleteSuccessResponseDto,
  PractitionerApplicationDetailsSuccessResponseDto,
  PractitionerApplicationListSuccessResponseDto,
} from '../dto/practitioner-application-list-item-response.dto';
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

/**
 * Admin-only controller for practitioner application review decisions.
 * This scope is intentionally isolated from practitioner self-service profile/application endpoints.
 */
@ApiTags('Admin - Practitioner Applications')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, AdminGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Controller('admin/practitioner-applications')
export class PractitionerApplicationsAdminController {
  constructor(
    private readonly listPractitionerApplicationsUseCase: ListPractitionerApplicationsUseCase,
    private readonly getPractitionerApplicationDetailsUseCase: GetPractitionerApplicationDetailsUseCase,
    private readonly approvePractitionerApplicationUseCase: ApprovePractitionerApplicationUseCase,
    private readonly rejectPractitionerApplicationUseCase: RejectPractitionerApplicationUseCase,
    private readonly requestPractitionerApplicationChangesUseCase: RequestPractitionerApplicationChangesUseCase,
    private readonly createAdminPractitionerUseCase: CreateAdminPractitionerUseCase,
    private readonly updatePractitionerApplicationDraftUseCase: UpdatePractitionerApplicationDraftUseCase,
    private readonly upsertPractitionerApplicationCredentialUseCase: UpsertPractitionerApplicationCredentialUseCase,
    private readonly deletePractitionerApplicationCredentialUseCase: DeletePractitionerApplicationCredentialUseCase,
  ) {}

  /** Lists practitioner applications for admin queues with optional status/search filters. */
  @Get()
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
  @ApiOperation({
    summary: 'Create practitioner directly (admin)',
    description:
      'Creates practitioner auth/account/profile baseline directly from admin scope, marks practitioner + application approved, and bypasses self-submitted onboarding application flow.',
  })
  @ApiBody({ type: CreateAdminPractitionerDto })
  @ApiResponse({
    status: 201,
    type: PractitionerApplicationDecisionSuccessResponseDto,
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
    return this.createAdminPractitionerUseCase.execute({
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

  /** Returns full admin details for one practitioner application. */
  @Get(':id')
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
      reason: body.reason,
      note: body.note,
    });
  }

  /** Rejects a practitioner application when transition policy allows it. */
  @Post(':id/reject')
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
      reason: body.reason,
      note: body.note,
    });
  }

  /** Requests changes for a practitioner application (editable again). */
  @Post(':id/request-changes')
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

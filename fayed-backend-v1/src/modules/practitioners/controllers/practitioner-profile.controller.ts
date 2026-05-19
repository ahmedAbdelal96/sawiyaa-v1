import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PractitionerApplicationStatusSuccessResponseDto } from '../dto/practitioner-application-status-response.dto';
import {
  PractitionerCredentialListResponseDto,
  PractitionerCredentialUploadSuccessResponseDto,
} from '../dto/practitioner-credential-response.dto';
import { PractitionerAvatarSuccessResponseDto } from '../dto/practitioner-avatar-response.dto';
import {
  PractitionerProfileSuccessResponseDto,
  PractitionerSpecialtiesSuccessResponseDto,
} from '../dto/practitioner-profile-response.dto';
import { PractitionerProfileReadinessSuccessResponseDto } from '../dto/practitioner-profile-readiness-response.dto';
import { SetPractitionerSpecialtiesDto } from '../dto/set-practitioner-specialties.dto';
import { SubmitPractitionerApplicationDto } from '../dto/submit-practitioner-application.dto';
import { UpdatePractitionerProfileDto } from '../dto/update-practitioner-profile.dto';
import { UploadPractitionerCredentialMetadataDto } from '../dto/upload-practitioner-credential-metadata.dto';
import { GetPractitionerApplicationStatusUseCase } from '../use-cases/get-practitioner-application-status.use-case';
import { GetPractitionerProfileUseCase } from '../use-cases/get-practitioner-profile.use-case';
import { GetPractitionerProfileReadinessUseCase } from '../use-cases/get-practitioner-profile-readiness.use-case';
import { ListPractitionerCredentialsUseCase } from '../use-cases/list-practitioner-credentials.use-case';
import { ListPractitionerSpecialtiesUseCase } from '../use-cases/list-practitioner-specialties.use-case';
import { SetPractitionerSpecialtiesUseCase } from '../use-cases/set-practitioner-specialties.use-case';
import { SubmitPractitionerApplicationUseCase } from '../use-cases/submit-practitioner-application.use-case';
import { UpdatePractitionerProfileUseCase } from '../use-cases/update-practitioner-profile.use-case';
import { RemovePractitionerAvatarUseCase } from '../use-cases/remove-practitioner-avatar.use-case';
import { UpdatePractitionerAvatarUseCase } from '../use-cases/update-practitioner-avatar.use-case';
import { UploadPractitionerCredentialMetadataUseCase } from '../use-cases/upload-practitioner-credential-metadata.use-case';
import { UpsertPractitionerAvatarDto } from '../dto/upsert-practitioner-avatar.dto';
import { UploadPractitionerCredentialFileDto } from '../dto/upload-practitioner-credential-file.dto';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { SecurityAuditOutcome } from '@prisma/client';
import { UploadPractitionerCredentialFileUseCase } from '../use-cases/upload-practitioner-credential-file.use-case';
import { PractitionerAvatarStorageService } from '../services/practitioner-avatar-storage.service';

/**
 * Practitioners controller provides only the current practitioner's own baseline profile/readiness/application surfaces.
 * It intentionally excludes admin review and advanced practitioner operations.
 */
@ApiTags('Practitioners')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(
  AccountStateRequirement.ACTIVE_ACCOUNT,
  AccountStateRequirement.PRACTITIONER_OTP_VERIFIED,
)
@Roles(AppRole.PRACTITIONER)
@Controller('practitioners')
export class PractitionerProfileController {
  constructor(
    private readonly getPractitionerProfileUseCase: GetPractitionerProfileUseCase,
    private readonly updatePractitionerProfileUseCase: UpdatePractitionerProfileUseCase,
    private readonly setPractitionerSpecialtiesUseCase: SetPractitionerSpecialtiesUseCase,
    private readonly listPractitionerSpecialtiesUseCase: ListPractitionerSpecialtiesUseCase,
    private readonly uploadPractitionerCredentialMetadataUseCase: UploadPractitionerCredentialMetadataUseCase,
    private readonly uploadPractitionerCredentialFileUseCase: UploadPractitionerCredentialFileUseCase,
    private readonly updatePractitionerAvatarUseCase: UpdatePractitionerAvatarUseCase,
    private readonly removePractitionerAvatarUseCase: RemovePractitionerAvatarUseCase,
    private readonly listPractitionerCredentialsUseCase: ListPractitionerCredentialsUseCase,
    private readonly submitPractitionerApplicationUseCase: SubmitPractitionerApplicationUseCase,
    private readonly getPractitionerApplicationStatusUseCase: GetPractitionerApplicationStatusUseCase,
    private readonly getPractitionerProfileReadinessUseCase: GetPractitionerProfileReadinessUseCase,
    private readonly practitionerAvatarStorageService: PractitionerAvatarStorageService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  /** Returns practitioner product-facing summary for the currently authenticated practitioner. */
  @Get('me')
  @ApiOperation({
    summary: 'Get current practitioner profile summary',
    description:
      'Returns practitioner profile basics, specialties, credential summary, readiness, and latest application status. This GET endpoint is side-effect free and does not auto-create profile records.',
  })
  @ApiResponse({ status: 200, type: PractitionerProfileSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner profile does not exist yet',
  })
  me(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getPractitionerProfileUseCase.execute({
      userId: currentUser.id,
      locale,
      currentUser,
    });
  }

  /** Updates current practitioner avatar URL. */
  @Patch('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiOperation({
    summary: 'Update practitioner avatar',
    description:
      'Stores practitioner profile avatar URL or uploads an avatar image file.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        avatarUrl: { type: 'string', format: 'uri' },
      },
    },
  })
  @ApiResponse({ status: 200, type: PractitionerAvatarSuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner profile does not exist yet',
  })
  updateAvatar(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
        }
      | undefined,
    @Body() body: UpsertPractitionerAvatarDto,
  ) {
    return this.updatePractitionerAvatarUseCase.execute({
      userId: currentUser.id,
      locale,
      avatarUrl: body.avatarUrl,
      file,
    });
  }

  /** Streams the current practitioner avatar binary. */
  @Get('me/avatar')
  @ApiOperation({
    summary: 'Get practitioner avatar binary',
    description: 'Returns the current practitioner avatar binary stream.',
  })
  @ApiResponse({ status: 200, description: 'Avatar binary stream' })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({ description: 'Avatar does not exist' })
  async getAvatar(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const avatar = await this.practitionerAvatarStorageService.getAvatarFile(
      currentUser.id,
    );

    if (!avatar) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.avatarNotFound',
        error: 'PRACTITIONER_AVATAR_NOT_FOUND',
      });
    }

    response.setHeader('Content-Type', avatar.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    return new StreamableFile(createReadStream(avatar.absolutePath));
  }

  /** Removes current practitioner avatar URL. */
  @Delete('me/avatar')
  @ApiOperation({
    summary: 'Remove practitioner avatar',
    description:
      'Clears practitioner profile avatar URL. This endpoint does not delete files from storage providers.',
  })
  @ApiResponse({ status: 200, type: PractitionerAvatarSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner profile does not exist yet',
  })
  removeAvatar(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.removePractitionerAvatarUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }

  /** Updates baseline practitioner profile fields and linked language codes. */
  @Patch('me')
  @ApiOperation({
    summary: 'Update current practitioner profile',
    description:
      'Updates baseline practitioner profile fields and lightweight user preferences used by readiness.',
  })
  @ApiBody({ type: UpdatePractitionerProfileDto })
  @ApiResponse({ status: 200, type: PractitionerProfileSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation failed, or country/language values are invalid',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: UpdatePractitionerProfileDto,
  ) {
    return this.updatePractitionerProfileUseCase
      .execute({
        userId: currentUser.id,
        locale,
        currentUser,
        data: {
          displayName: body.displayName,
          professionalTitle: body.professionalTitle,
          bio: body.bio,
          countryCode: body.countryCode,
          yearsOfExperience: body.yearsOfExperience,
          practitionerType: body.practitionerType,
          practitionerGender: body.practitionerGender,
          sessionPrice30Egp: body.sessionPrice30Egp,
          sessionPrice30Usd: body.sessionPrice30Usd,
          sessionPrice60Egp: body.sessionPrice60Egp,
          sessionPrice60Usd: body.sessionPrice60Usd,
          acceptsPackage: body.acceptsPackage,
          locale: body.locale,
          timezone: body.timezone,
          languageCodes: body.languageCodes,
          payoutDestination: body.payoutDestination,
        },
      })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'security.practitioner.application.draft-update',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'PractitionerApplication',
          targetUserId: currentUser.id,
          metadata: {
            updatedFields: Object.keys(body).sort(),
            hasPayoutDestination: body.payoutDestination !== undefined,
          },
        });
        return result;
      });
  }

  /** Replaces practitioner specialty links in one deterministic operation. */
  @Put('me/specialties')
  @ApiOperation({
    summary: 'Set current practitioner specialties',
    description:
      'Validates incoming specialty ids against active specialties and replaces existing links.',
  })
  @ApiBody({ type: SetPractitionerSpecialtiesDto })
  @ApiResponse({ status: 200, type: PractitionerSpecialtiesSuccessResponseDto })
  @ApiBadRequestResponse({
    description:
      'Payload is invalid, duplicates exist, or specialty id is unknown',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  setSpecialties(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: SetPractitionerSpecialtiesDto,
  ) {
    return this.setPractitionerSpecialtiesUseCase
      .execute({
        userId: currentUser.id,
        locale,
        primarySpecialtyCategoryId: body.primarySpecialtyCategoryId,
        specialtyIds: body.specialtyIds,
      })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'security.practitioner.application.specialties-update',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'PractitionerApplication',
          targetUserId: currentUser.id,
          metadata: {
            specialtyCount: body.specialtyIds.length,
            primarySpecialtyCategoryId: body.primarySpecialtyCategoryId,
          },
        });
        return result;
      });
  }

  /** Lists currently linked specialties for the current practitioner profile. */
  @Get('me/specialties')
  @ApiOperation({
    summary: 'List current practitioner specialties',
    description:
      'Returns linked specialties with primary marker and localized title.',
  })
  @ApiResponse({ status: 200, type: PractitionerSpecialtiesSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner profile does not exist yet',
  })
  listSpecialties(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.listPractitionerSpecialtiesUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }

  /** Stores practitioner credential metadata record used later by review/admin modules. */
  @Post('me/credentials')
  @ApiOperation({
    summary: 'Upload practitioner credential metadata',
    description:
      'Creates a practitioner credential metadata record (type, file reference, optional expiry).',
  })
  @ApiBody({ type: UploadPractitionerCredentialMetadataDto })
  @ApiResponse({
    status: 201,
    type: PractitionerCredentialUploadSuccessResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({
    description:
      'A credential with the same type and file reference already exists',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  uploadCredential(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: UploadPractitionerCredentialMetadataDto,
  ) {
    return this.uploadPractitionerCredentialMetadataUseCase
      .execute({
        userId: currentUser.id,
        locale,
        credentialType: body.credentialType,
        fileUrl: body.fileUrl,
        expiresAt:
          body.expiresAt === undefined
            ? undefined
            : body.expiresAt === null
              ? null
              : new Date(body.expiresAt),
      })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'security.practitioner.application.credential-upload',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'PractitionerApplication',
          targetUserId: currentUser.id,
          metadata: {
            credentialType: body.credentialType,
            hasExpiry: body.expiresAt !== undefined && body.expiresAt !== null,
          },
        });
        return result;
      });
  }

  /** Uploads practitioner credential file and creates credential record in one request. */
  @Post('me/credentials/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary: 'Upload practitioner credential file',
    description:
      'Uploads a credential file (pdf/image) and creates a credential record with safe storage URL.',
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
    type: PractitionerCredentialUploadSuccessResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid file, type, or payload' })
  @ApiConflictResponse({
    description: 'A duplicate credential record already exists',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  uploadCredentialFile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
        }
      | undefined,
    @Body() body: UploadPractitionerCredentialFileDto,
  ) {
    return this.uploadPractitionerCredentialFileUseCase
      .execute({
        userId: currentUser.id,
        locale,
        credentialType: body.credentialType,
        expiresAt:
          body.expiresAt === undefined
            ? undefined
            : body.expiresAt === null
              ? null
              : new Date(body.expiresAt),
        file,
      })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'security.practitioner.application.credential-upload',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'PractitionerApplication',
          targetUserId: currentUser.id,
          metadata: {
            credentialType: body.credentialType,
            hasExpiry: body.expiresAt !== undefined && body.expiresAt !== null,
            hasBinaryUpload: true,
          },
        });
        return result;
      });
  }

  /** Lists practitioner credential metadata records for the current practitioner. */
  @Get('me/credentials')
  @ApiOperation({
    summary: 'List practitioner credential metadata',
    description: 'Returns credential metadata records in reverse upload order.',
  })
  @ApiResponse({ status: 200, type: PractitionerCredentialListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner profile does not exist yet',
  })
  listCredentials(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.listPractitionerCredentialsUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }

  /** Submits practitioner application after readiness and eligibility checks succeed. */
  @Post('me/application/submit')
  @ApiOperation({
    summary: 'Submit practitioner application',
    description:
      'Submits or resubmits practitioner application only when readiness policy is satisfied.',
  })
  @ApiBody({ type: SubmitPractitionerApplicationDto })
  @ApiResponse({
    status: 201,
    type: PractitionerApplicationStatusSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Practitioner is not eligible to submit the application yet',
  })
  @ApiConflictResponse({
    description: 'Application is already submitted, under review, or approved',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  submitApplication(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: SubmitPractitionerApplicationDto,
  ) {
    return this.submitPractitionerApplicationUseCase
      .execute({
        userId: currentUser.id,
        locale,
        currentUser,
        data: body,
      })
      .then((result) => {
        this.securityAuditService.logAsync({
          action: 'security.practitioner.application.submit',
          outcome: SecurityAuditOutcome.SUCCESS,
          actorUserId: currentUser.id,
          actorRoles: currentUser.roles,
          resourceType: 'PractitionerApplication',
          targetUserId: currentUser.id,
          metadata: {
            applicationId: result.application?.applicationId ?? null,
          },
        });
        return result;
      });
  }

  /** Returns latest application status summary for the current practitioner. */
  @Get('me/application')
  @ApiOperation({
    summary: 'Get practitioner application status summary',
    description:
      'Returns latest application status together with readiness-driven submission eligibility summary.',
  })
  @ApiResponse({
    status: 200,
    type: PractitionerApplicationStatusSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner profile does not exist yet',
  })
  applicationStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getPractitionerApplicationStatusUseCase.execute({
      userId: currentUser.id,
      locale,
      currentUser,
    });
  }

  /** Dedicated readiness endpoint for frontend onboarding/progress UI. */
  @Get('me/readiness')
  @ApiOperation({
    summary: 'Get practitioner profile readiness',
    description:
      'Returns deterministic readiness checks, missing requirements, and submission eligibility baseline.',
  })
  @ApiResponse({
    status: 200,
    type: PractitionerProfileReadinessSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({
    description: 'Practitioner profile does not exist yet',
  })
  readiness(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getPractitionerProfileReadinessUseCase.execute({
      userId: currentUser.id,
      locale,
      currentUser,
    });
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PatientProfileSuccessResponseDto } from '../dto/patient-profile-response.dto';
import { PatientAvatarSuccessResponseDto } from '../dto/patient-avatar-response.dto';
import { UpdatePatientProfileDto } from '../dto/update-patient-profile.dto';
import { GetPatientProfileUseCase } from '../use-cases/get-patient-profile.use-case';
import { UpdatePatientProfileUseCase } from '../use-cases/update-patient-profile.use-case';
import { UpdatePatientAvatarUseCase } from '../use-cases/update-patient-avatar.use-case';
import { RemovePatientAvatarUseCase } from '../use-cases/remove-patient-avatar.use-case';
import { GetPatientAvatarFileUseCase } from '../use-cases/get-patient-avatar-file.use-case';

type UploadedAvatarFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

/**
 * Patient profile controller exposes only the current patient's own baseline profile.
 * It does not handle auth, bookings, or practitioner-facing concerns.
 */
@ApiTags('Patients')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients')
export class PatientProfileController {
  constructor(
    private readonly getPatientProfileUseCase: GetPatientProfileUseCase,
    private readonly updatePatientProfileUseCase: UpdatePatientProfileUseCase,
    private readonly updatePatientAvatarUseCase: UpdatePatientAvatarUseCase,
    private readonly removePatientAvatarUseCase: RemovePatientAvatarUseCase,
    private readonly getPatientAvatarFileUseCase: GetPatientAvatarFileUseCase,
  ) {}

  /**
   * GET is intentionally read-only and returns the caller's own patient profile when it already exists.
   * Baseline profile creation is deferred to the write path so a simple read does not create persistence side effects.
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get current patient profile',
    description:
      'Returns the current authenticated patient profile with baseline personalization fields and onboarding state.',
  })
  @ApiResponse({ status: 200, type: PatientProfileSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  @ApiNotFoundResponse({
    description: 'Patient profile does not exist yet for this account',
  })
  me(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getPatientProfileUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }

  /**
   * PATCH updates baseline profile data and may optionally complete onboarding in the same request.
   * It is also the first safe place to bootstrap a missing patient profile without turning GET into a write operation.
   */
  @Patch('me')
  @ApiOperation({
    summary: 'Update current patient profile',
    description:
      'Updates baseline patient profile fields. If completeOnboarding is true, the module will also try to mark onboarding as completed after the update.',
  })
  @ApiBody({ type: UpdatePatientProfileDto })
  @ApiResponse({ status: 200, type: PatientProfileSuccessResponseDto })
  @ApiBadRequestResponse({
    description:
      'Validation failed, country code is invalid, or onboarding requirements are not yet satisfied',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: UpdatePatientProfileDto,
  ) {
    return this.updatePatientProfileUseCase.execute({
      userId: currentUser.id,
      locale,
      data: {
        displayName: body.displayName,
        dateOfBirth:
          body.dateOfBirth === undefined
            ? undefined
            : body.dateOfBirth === null
              ? null
              : new Date(body.dateOfBirth),
        gender: body.gender,
        locale: body.locale,
        countryCode: body.countryCode,
        timezone: body.timezone,
        completeOnboarding: body.completeOnboarding,
      },
    });
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload current patient profile photo',
    description:
      'Uploads or replaces the current patient profile photo with strict image validation and deterministic storage cleanup.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, type: PatientAvatarSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Missing file, unsupported image type, or file too large',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  uploadAvatar(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @UploadedFile() file: UploadedAvatarFile | undefined,
  ) {
    return this.updatePatientAvatarUseCase.execute({
      userId: currentUser.id,
      locale,
      file,
    });
  }

  @Delete('me/avatar')
  @ApiOperation({
    summary: 'Remove current patient profile photo',
    description:
      'Removes current patient profile photo and deletes stored file.',
  })
  @ApiResponse({ status: 200, type: PatientAvatarSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  removeAvatar(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.removePatientAvatarUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }

  @Get('me/avatar')
  @ApiOperation({
    summary: 'Get current patient profile photo binary',
    description:
      'Returns the current patient profile photo binary for authenticated patient profile rendering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar binary stream',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  @ApiNotFoundResponse({
    description: 'Patient avatar does not exist',
  })
  async getAvatar(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const avatar = await this.getPatientAvatarFileUseCase.execute({
      userId: currentUser.id,
    });

    response.setHeader('Content-Type', avatar.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    return new StreamableFile(createReadStream(avatar.absolutePath));
  }
}

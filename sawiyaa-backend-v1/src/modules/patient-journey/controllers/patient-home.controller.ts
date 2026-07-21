import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { resolveCountryFromRequest } from '@modules/auth/utils/request-country-context.util';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
import {
  PatientHomeSuccessResponseDto,
  TrackPatientPractitionerViewSuccessResponseDto,
} from '../dto/patient-home-response.dto';
import { GetMyPatientHomeUseCase } from '../use-cases/get-my-patient-home.use-case';
import { TrackPatientPractitionerViewUseCase } from '../use-cases/track-patient-practitioner-view.use-case';

@ApiTags('Patient Home')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me')
export class PatientHomeController {
  constructor(
    private readonly getMyPatientHomeUseCase: GetMyPatientHomeUseCase,
    private readonly trackPatientPractitionerViewUseCase: TrackPatientPractitionerViewUseCase,
  ) {}

  @Get('home')
  @ApiOperation({
    summary: 'Get patient home modules',
    description:
      'Returns patient home modules including recently visited specialists and lightweight CTA cards.',
  })
  @ApiResponse({ status: 200, type: PatientHomeSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access patient home',
  })
  @ApiNotFoundResponse({ description: 'Patient profile was not found' })
  async getHome(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Req() request: Request,
  ) {
    const result = await this.getMyPatientHomeUseCase.execute({
      userId: currentUser.id,
      locale: locale ?? 'ar',
      requestCountryIsoCode: resolveCountryFromRequest(request).countryCode,
    });

    return {
      success: true as const,
      data: result,
    };
  }

  @Post('practitioner-views/:slug')
  @ApiOperation({
    summary: 'Track patient practitioner profile view',
    description:
      'Upserts a patient view record for a public practitioner profile by slug.',
  })
  @ApiResponse({
    status: 201,
    type: TrackPatientPractitionerViewSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may track practitioner views',
  })
  @ApiNotFoundResponse({
    description: 'Patient profile or public practitioner was not found',
  })
  async trackPractitionerView(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('slug') slug: string,
  ) {
    const result = await this.trackPatientPractitionerViewUseCase.execute({
      userId: currentUser.id,
      slug,
      locale: locale ?? 'ar',
    });

    return {
      success: true as const,
      data: result,
    };
  }
}

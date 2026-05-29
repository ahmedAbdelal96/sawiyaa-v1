import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  PreviewCorporateSponsorshipDto,
  ReserveCorporateSponsorshipDto,
} from '../dto/patient-corporate-sponsorship.dto';
import {
  CorporateSponsorshipPreviewResponseDto,
  CorporateSponsorshipReserveResponseDto,
  CorporateSponsorshipReleaseResponseDto,
} from '../dto/patient-corporate-sponsorship-response.dto';
import {
  PreviewCorporateSponsorshipUseCase,
  ReserveCorporateSponsorshipUseCase,
  ReleaseCorporateSponsorshipUseCase,
} from '../use-cases/patient-corporate-sponsorship.use-cases';

@ApiTags('Patient Corporate Sponsorship')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me/sessions')
export class PatientCorporateSponsorshipController {
  constructor(
    private readonly previewCorporateSponsorshipUseCase: PreviewCorporateSponsorshipUseCase,
    private readonly reserveCorporateSponsorshipUseCase: ReserveCorporateSponsorshipUseCase,
    private readonly releaseCorporateSponsorshipUseCase: ReleaseCorporateSponsorshipUseCase,
  ) {}

  @Post(':sessionId/corporate-sponsorship/preview')
  @ApiOperation({
    summary: 'Preview corporate sponsorship on a session',
    description:
      'Returns coverage breakdown for a company+benefit code without reserving or mutating anything.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session id' })
  @ApiResponse({ status: 200, type: CorporateSponsorshipPreviewResponseDto })
  preview(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('sessionId') sessionId: string,
    @Body() body: PreviewCorporateSponsorshipDto,
  ) {
    return this.previewCorporateSponsorshipUseCase.execute({
      userId: currentUser.id,
      sessionId,
      companyCode: body.companyCode,
      benefitCode: body.benefitCode,
    });
  }

  @Post(':sessionId/corporate-sponsorship/reserve')
  @ApiOperation({
    summary: 'Reserve a corporate benefit code on a session',
    description:
      'Atomically reserves the code and creates a sponsorship record. Only PREPAID contracts supported in V1.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session id' })
  @ApiResponse({ status: 201, type: CorporateSponsorshipReserveResponseDto })
  reserve(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('sessionId') sessionId: string,
    @Body() body: ReserveCorporateSponsorshipDto,
  ) {
    return this.reserveCorporateSponsorshipUseCase.execute({
      userId: currentUser.id,
      sessionId,
      companyCode: body.companyCode,
      benefitCode: body.benefitCode,
    });
  }

  @Delete(':sessionId/corporate-sponsorship/reservation')
  @ApiOperation({
    summary: 'Release corporate sponsorship reservation',
    description:
      'Releases the reservation and returns the code to AVAILABLE if safe.',
  })
  @ApiParam({ name: 'sessionId', description: 'Session id' })
  @ApiResponse({ status: 200, type: CorporateSponsorshipReleaseResponseDto })
  release(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('sessionId') sessionId: string,
  ) {
    return this.releaseCorporateSponsorshipUseCase.execute({
      userId: currentUser.id,
      sessionId,
    });
  }
}
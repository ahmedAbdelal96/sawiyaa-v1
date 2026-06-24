import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { ActiveAccountGuard } from '@common/guards/account-state/active-account.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { PackagePlanQuoteRequestDto } from '../dto/package-plan-quote-request.dto';
import { PackagePlanQuotedItemSuccessResponseDto } from '../dto/package-plan-quote-response.dto';
import { QuotePackagePlanUseCase } from '../use-cases/quote-package-plan.use-case';

@ApiTags('Patients - Package Plans')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard, ActiveAccountGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me/package-purchases')
export class PatientPackageQuotesController {
  constructor(
    private readonly quotePackagePlanUseCase: QuotePackagePlanUseCase,
  ) {}

  @Post('quote')
  @ApiOperation({
    summary: 'Quote a standardized package plan',
    description:
      'Returns a patient-facing package quote for the selected practitioner and package plan without creating a purchase.',
  })
  @ApiResponse({ status: 200, type: PackagePlanQuotedItemSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description: 'Only active patient accounts may access this route',
  })
  quote(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: PackagePlanQuoteRequestDto,
  ) {
    return this.quotePackagePlanUseCase
      .execute({
        userId: currentUser.id,
        locale,
        packagePlanCode: body.packagePlanCode,
        practitionerSlug: body.practitionerSlug,
        durationMinutes: body.durationMinutes,
        sessionMode: body.sessionMode,
        requestedCurrencyCode: body.currencyCode,
      })
      .then((data) => ({ success: true as const, data }));
  }
}

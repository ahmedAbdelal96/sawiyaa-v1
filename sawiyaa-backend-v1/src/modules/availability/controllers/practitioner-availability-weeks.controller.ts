import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
  AvailabilityWeekMutationSuccessResponseDto,
  AvailabilityWeekOverviewSuccessResponseDto,
  CreateAvailabilityWeekDto,
  UpdateAvailabilityWeekDto,
} from '../dto/availability-week.dto';
import { CopyPractitionerAvailabilityWeekToNextUseCase } from '../use-cases/copy-practitioner-availability-week-to-next.use-case';
import { CreatePractitionerAvailabilityWeekUseCase } from '../use-cases/create-practitioner-availability-week.use-case';
import { GetMyAvailabilityWeeksUseCase } from '../use-cases/get-my-availability-weeks.use-case';
import { PublishPractitionerAvailabilityWeekUseCase } from '../use-cases/publish-practitioner-availability-week.use-case';
import { UpdatePractitionerAvailabilityWeekUseCase } from '../use-cases/update-practitioner-availability-week.use-case';

@ApiTags('Availability')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(
  AccountStateRequirement.ACTIVE_ACCOUNT,
  AccountStateRequirement.PRACTITIONER_OTP_VERIFIED,
  AccountStateRequirement.PRACTITIONER_APPROVED,
)
@Roles(AppRole.PRACTITIONER)
@Controller('practitioners/me/availability/weeks')
export class PractitionerAvailabilityWeeksController {
  constructor(
    private readonly getMyAvailabilityWeeksUseCase: GetMyAvailabilityWeeksUseCase,
    private readonly createPractitionerAvailabilityWeekUseCase: CreatePractitionerAvailabilityWeekUseCase,
    private readonly updatePractitionerAvailabilityWeekUseCase: UpdatePractitionerAvailabilityWeekUseCase,
    private readonly copyPractitionerAvailabilityWeekToNextUseCase: CopyPractitionerAvailabilityWeekToNextUseCase,
    private readonly publishPractitionerAvailabilityWeekUseCase: PublishPractitionerAvailabilityWeekUseCase,
  ) {}

  @Get('current-next')
  @ApiOperation({
    summary: 'Get practitioner current and next availability weeks',
    description:
      'Returns the current and next Sunday-based availability weeks in the practitioner timezone, including the UI reminder state.',
  })
  @ApiResponse({ status: 200, type: AvailabilityWeekOverviewSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found' })
  getCurrentAndNextWeeks(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getMyAvailabilityWeeksUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Create a draft availability week',
    description:
      'Creates a Sunday-based draft week in the practitioner timezone. Drafts are not published automatically.',
  })
  @ApiBody({ type: CreateAvailabilityWeekDto })
  @ApiResponse({ status: 201, type: AvailabilityWeekMutationSuccessResponseDto })
  @ApiBadRequestResponse({
    description:
      'Timezone is invalid, week start date is invalid, or weekly slots are invalid',
  })
  @ApiConflictResponse({
    description: 'A week already exists for the requested week start date',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  createWeek(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: CreateAvailabilityWeekDto,
  ) {
    return this.createPractitionerAvailabilityWeekUseCase.execute({
      userId: currentUser.id,
      locale,
      weekStartDate: body.weekStartDate,
      timezone: body.timezone,
      slots: body.slots,
    });
  }

  @Patch(':weekId')
  @ApiOperation({
    summary: 'Update a draft availability week',
    description:
      'Updates a draft week only. Published weeks remain immutable in normal practitioner flows.',
  })
  @ApiParam({ name: 'weekId', description: 'Availability week id' })
  @ApiBody({ type: UpdateAvailabilityWeekDto })
  @ApiResponse({ status: 200, type: AvailabilityWeekMutationSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Timezone is invalid or weekly slots are invalid',
  })
  @ApiConflictResponse({
    description: 'Week is not editable because it is not a draft',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({ description: 'Availability week was not found' })
  updateWeek(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('weekId') weekId: string,
    @Body() body: UpdateAvailabilityWeekDto,
  ) {
    return this.updatePractitionerAvailabilityWeekUseCase.execute({
      userId: currentUser.id,
      locale,
      weekId,
      timezone: body.timezone,
      slots: body.slots,
    });
  }

  @Post(':weekId/copy-to-next')
  @ApiOperation({
    summary: 'Copy a week to the next week as a draft',
    description:
      'Copies the selected week into the next Sunday-based week as a draft without publishing it automatically.',
  })
  @ApiParam({ name: 'weekId', description: 'Availability week id' })
  @ApiResponse({ status: 201, type: AvailabilityWeekMutationSuccessResponseDto })
  @ApiConflictResponse({
    description:
      'The next week already exists and cannot be overwritten by an automatic copy',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({ description: 'Availability week was not found' })
  copyToNext(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('weekId') weekId: string,
  ) {
    return this.copyPractitionerAvailabilityWeekToNextUseCase.execute({
      userId: currentUser.id,
      locale,
      weekId,
    });
  }

  @Post(':weekId/publish')
  @ApiOperation({
    summary: 'Publish a draft availability week',
    description:
      'Publishes a draft week after validating that it has at least one valid slot.',
  })
  @ApiParam({ name: 'weekId', description: 'Availability week id' })
  @ApiResponse({ status: 200, type: AvailabilityWeekMutationSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Week is not publishable or payload is invalid',
  })
  @ApiConflictResponse({
    description: 'Week is not editable because it is not a draft',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({ description: 'Availability week was not found' })
  publishWeek(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('weekId') weekId: string,
  ) {
    return this.publishPractitionerAvailabilityWeekUseCase.execute({
      userId: currentUser.id,
      locale,
      weekId,
    });
  }
}

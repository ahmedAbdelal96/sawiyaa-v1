import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  NotFoundException,
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
  AvailabilityRollingWindowSuccessResponseDto,
  AvailabilityWeekDetailsResponseDto,
  CreateAvailabilityWeekDto,
  RepeatAvailabilityWeekConfirmRequestDto,
  RepeatAvailabilityWeekConfirmResponseDto,
  RepeatAvailabilityWeekPreviewRequestDto,
  RepeatAvailabilityWeekPreviewResponseDto,
  UpdateAvailabilityWeekDto,
} from '../dto/availability-week.dto';
import { CreatePractitionerAvailabilityWeekUseCase } from '../use-cases/create-practitioner-availability-week.use-case';
import { GetMyAvailabilityWeeksUseCase } from '../use-cases/get-my-availability-weeks.use-case';
import { PublishPractitionerAvailabilityWeekUseCase } from '../use-cases/publish-practitioner-availability-week.use-case';
import { UpdatePractitionerAvailabilityWeekUseCase } from '../use-cases/update-practitioner-availability-week.use-case';
import { AvailabilityScheduleRepeatService } from '../services/availability-schedule-repeat.service';
import { GetPractitionerAvailabilityWeekDetailsUseCase } from '../use-cases/get-practitioner-availability-week-details.use-case';

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
    private readonly publishPractitionerAvailabilityWeekUseCase: PublishPractitionerAvailabilityWeekUseCase,
    private readonly availabilityScheduleRepeatService: AvailabilityScheduleRepeatService,
    private readonly getPractitionerAvailabilityWeekDetailsUseCase: GetPractitionerAvailabilityWeekDetailsUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get practitioner active weekly schedule window',
    description:
      'Returns the current week and the configured future scheduling window using practitioner-local Sunday boundaries.',
  })
  @ApiResponse({ status: 200, type: AvailabilityRollingWindowSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found' })
  getActiveWeeks(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getMyAvailabilityWeeksUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }

  @Get(':weekId')
  @ApiOperation({ summary: 'Get one practitioner weekly schedule with session details' })
  @ApiParam({ name: 'weekId', description: 'Availability week id' })
  @ApiResponse({ status: 200, type: AvailabilityWeekDetailsResponseDto })
  @ApiNotFoundResponse({ description: 'Availability week was not found' })
  getWeekDetails(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('weekId') weekId: string,
  ) {
    if (weekId === 'current-next') {
      throw new NotFoundException({ messageKey: 'availability.errors.weekNotFound', errorCode: 'AVAILABILITY_WEEK_NOT_FOUND' });
    }
    return this.getPractitionerAvailabilityWeekDetailsUseCase.execute({ userId: currentUser.id, weekId, locale });
  }

  @Post()
  @ApiOperation({
    summary: 'Create a weekly session schedule',
    description:
      'Creates a Sunday-based weekly schedule in the practitioner timezone. It is not published automatically.',
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
    summary: 'Update a weekly session schedule',
    description:
      'Updates an unpublished schedule or an editable published schedule according to booking protection rules.',
  })
  @ApiParam({ name: 'weekId', description: 'Availability week id' })
  @ApiBody({ type: UpdateAvailabilityWeekDto })
  @ApiResponse({ status: 200, type: AvailabilityWeekMutationSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Timezone is invalid or weekly slots are invalid',
  })
  @ApiConflictResponse({
    description: 'The schedule is not editable in its current state',
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

  @Post(':sourceWeekId/repeat/preview')
  @ApiOperation({ summary: 'Preview repeating a weekly schedule into selected future weeks' })
  @ApiBody({ type: RepeatAvailabilityWeekPreviewRequestDto })
  @ApiResponse({ status: 201, type: RepeatAvailabilityWeekPreviewResponseDto })
  previewRepeat(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('sourceWeekId') sourceWeekId: string,
    @Body() body: RepeatAvailabilityWeekPreviewRequestDto,
  ) {
    return this.availabilityScheduleRepeatService.preview({
      userId: currentUser.id,
      sourceWeekId,
      targetWeekStartDates: body.targetWeekStartDates,
      idempotencyKey: body.idempotencyKey,
    });
  }

  @Post(':sourceWeekId/repeat/confirm')
  @ApiOperation({ summary: 'Confirm a previously previewed weekly schedule repeat' })
  @ApiBody({ type: RepeatAvailabilityWeekConfirmRequestDto })
  @ApiResponse({ status: 201, type: RepeatAvailabilityWeekConfirmResponseDto })
  confirmRepeat(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('sourceWeekId') sourceWeekId: string,
    @Body() body: RepeatAvailabilityWeekConfirmRequestDto,
  ) {
    return this.availabilityScheduleRepeatService.confirm({
      userId: currentUser.id,
      sourceWeekId,
      operationId: body.operationId,
      idempotencyKey: body.idempotencyKey,
    });
  }

  @Post(':weekId/publish')
  @ApiOperation({
    summary: 'Publish a weekly session schedule',
    description:
      'Publishes a schedule after validating that it has at least one valid session time.',
  })
  @ApiParam({ name: 'weekId', description: 'Availability week id' })
  @ApiResponse({ status: 200, type: AvailabilityWeekMutationSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Week is not publishable or payload is invalid',
  })
  @ApiConflictResponse({
    description: 'The schedule is not eligible for publication',
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

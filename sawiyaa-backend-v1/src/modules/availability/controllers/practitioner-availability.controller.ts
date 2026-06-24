import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
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
  AvailabilityMutationSuccessResponseDto,
  MyAvailabilitySuccessResponseDto,
} from '../dto/availability-response.dto';
import {
  CreateAvailabilityExceptionDto,
  UpdateAvailabilityExceptionDto,
} from '../dto/availability-exception.dto';
import { ReplaceWeeklyAvailabilityDto } from '../dto/replace-weekly-availability.dto';
import { CreateAvailabilityExceptionUseCase } from '../use-cases/create-availability-exception.use-case';
import { DeleteAvailabilityExceptionUseCase } from '../use-cases/delete-availability-exception.use-case';
import { GetMyAvailabilityUseCase } from '../use-cases/get-my-availability.use-case';
import { ReplaceWeeklyAvailabilityUseCase } from '../use-cases/replace-weekly-availability.use-case';
import { UpdateAvailabilityExceptionUseCase } from '../use-cases/update-availability-exception.use-case';

/**
 * Self-service practitioner availability controller.
 * This surface owns schedule management only and intentionally excludes presence, session state, and booking flows.
 */
@ApiTags('Availability')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(
  AccountStateRequirement.ACTIVE_ACCOUNT,
  AccountStateRequirement.PRACTITIONER_OTP_VERIFIED,
  AccountStateRequirement.PRACTITIONER_APPROVED,
)
@Roles(AppRole.PRACTITIONER)
@Controller('practitioners/me/availability')
export class PractitionerAvailabilityController {
  constructor(
    private readonly getMyAvailabilityUseCase: GetMyAvailabilityUseCase,
    private readonly replaceWeeklyAvailabilityUseCase: ReplaceWeeklyAvailabilityUseCase,
    private readonly createAvailabilityExceptionUseCase: CreateAvailabilityExceptionUseCase,
    private readonly updateAvailabilityExceptionUseCase: UpdateAvailabilityExceptionUseCase,
    private readonly deleteAvailabilityExceptionUseCase: DeleteAvailabilityExceptionUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get current practitioner availability',
    description:
      'Returns practitioner timezone, active recurring weekly slots, and upcoming active exceptions. This endpoint is read-only and side-effect free.',
  })
  @ApiResponse({ status: 200, type: MyAvailabilitySuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({ description: 'Practitioner profile was not found' })
  getMyAvailability(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getMyAvailabilityUseCase.execute({
      userId: currentUser.id,
      locale,
    });
  }

  @Put('weekly-slots')
  @ApiOperation({
    summary: 'Replace recurring weekly availability',
    description:
      'Replaces the complete recurring weekly schedule in one transactional operation after validating overlaps and timezone semantics.',
  })
  @ApiBody({ type: ReplaceWeeklyAvailabilityDto })
  @ApiResponse({ status: 200, type: AvailabilityMutationSuccessResponseDto })
  @ApiBadRequestResponse({
    description:
      'Timezone is invalid, slot ranges are invalid, slot duration is invalid, or weekly slots overlap',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  replaceWeeklyAvailability(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: ReplaceWeeklyAvailabilityDto,
  ) {
    return this.replaceWeeklyAvailabilityUseCase.execute({
      userId: currentUser.id,
      locale,
      timezone: body.timezone,
      slots: body.slots,
    });
  }

  @Post('exceptions')
  @ApiOperation({
    summary: 'Create availability exception',
    description:
      'Creates a concrete UTC override window. BLOCK removes availability, while OPEN_EXTRA adds temporary windows outside the regular weekly schedule.',
  })
  @ApiBody({ type: CreateAvailabilityExceptionDto })
  @ApiResponse({ status: 201, type: AvailabilityMutationSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Exception range is invalid or payload format is invalid',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  createException(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: CreateAvailabilityExceptionDto,
  ) {
    return this.createAvailabilityExceptionUseCase.execute({
      userId: currentUser.id,
      locale,
      type: body.type,
      startsAtUtc: new Date(body.startsAt),
      endsAtUtc: new Date(body.endsAt),
      reason: body.reason,
    });
  }

  @Patch('exceptions/:id')
  @ApiOperation({
    summary: 'Update availability exception',
    description:
      'Updates a practitioner-owned active exception. This endpoint never mutates recurring weekly slots.',
  })
  @ApiParam({ name: 'id', description: 'Availability exception id' })
  @ApiBody({ type: UpdateAvailabilityExceptionDto })
  @ApiResponse({ status: 200, type: AvailabilityMutationSuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Exception range is invalid or payload is not mutable',
  })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({ description: 'Availability exception was not found' })
  updateException(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') exceptionId: string,
    @Body() body: UpdateAvailabilityExceptionDto,
  ) {
    return this.updateAvailabilityExceptionUseCase.execute({
      userId: currentUser.id,
      locale,
      exceptionId,
      type: body.type,
      startsAtUtc: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAtUtc: body.endsAt ? new Date(body.endsAt) : undefined,
      reason: body.reason,
    });
  }

  @Delete('exceptions/:id')
  @ApiOperation({
    summary: 'Delete availability exception',
    description:
      'Soft-deactivates the targeted practitioner-owned exception so it no longer affects derived availability windows.',
  })
  @ApiParam({ name: 'id', description: 'Availability exception id' })
  @ApiResponse({ status: 200, type: AvailabilityMutationSuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is required' })
  @ApiForbiddenResponse({
    description:
      'Route requires practitioner role, active account, and OTP-verified practitioner access',
  })
  @ApiNotFoundResponse({ description: 'Availability exception was not found' })
  deleteException(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') exceptionId: string,
  ) {
    return this.deleteAvailabilityExceptionUseCase.execute({
      userId: currentUser.id,
      locale,
      exceptionId,
    });
  }
}

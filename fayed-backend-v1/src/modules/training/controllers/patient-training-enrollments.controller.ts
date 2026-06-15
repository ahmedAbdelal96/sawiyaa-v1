import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
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
import { CreateTrainingEnrollmentDto } from '../dto/create-training-enrollment.dto';
import { TrainingEnrollmentPaymentRedirectQueryDto } from '../dto/training-enrollment-payment-redirect.dto';
import { ListPatientTrainingEnrollmentsDto } from '../dto/list-patient-training-enrollments.dto';
import {
  PatientTrainingEnrollmentItemSuccessResponseDto,
  PatientTrainingJoinAccessItemSuccessResponseDto,
  PatientTrainingEnrollmentListSuccessResponseDto,
} from '../dto/training-response.dto';
import { CreateTrainingEnrollmentUseCase } from '../use-cases/create-training-enrollment.use-case';
import { GetPatientTrainingEnrollmentUseCase } from '../use-cases/get-patient-training-enrollment.use-case';
import { GetPatientTrainingEnrollmentPaymentRedirectUseCase } from '../use-cases/get-patient-training-enrollment-payment-redirect.use-case';
import { ListPatientTrainingEnrollmentsUseCase } from '../use-cases/list-patient-training-enrollments.use-case';
import { ResolvePatientTrainingJoinAccessUseCase } from '../use-cases/resolve-patient-training-join-access.use-case';

@ApiTags('Training')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me/training')
export class PatientTrainingEnrollmentsController {
  constructor(
    private readonly createTrainingEnrollmentUseCase: CreateTrainingEnrollmentUseCase,
    private readonly getPatientTrainingEnrollmentPaymentRedirectUseCase: GetPatientTrainingEnrollmentPaymentRedirectUseCase,
    private readonly listPatientTrainingEnrollmentsUseCase: ListPatientTrainingEnrollmentsUseCase,
    private readonly getPatientTrainingEnrollmentUseCase: GetPatientTrainingEnrollmentUseCase,
    private readonly resolvePatientTrainingJoinAccessUseCase: ResolvePatientTrainingJoinAccessUseCase,
  ) {}

  @Post('schedules/:scheduleId/enrollments')
  @ApiOperation({
    summary: 'Create patient enrollment intent for a training schedule',
  })
  @ApiBody({ type: CreateTrainingEnrollmentDto })
  @ApiResponse({
    status: 201,
    type: PatientTrainingEnrollmentItemSuccessResponseDto,
  })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('scheduleId') scheduleId: string,
    @Body() body: CreateTrainingEnrollmentDto,
  ) {
    return this.createTrainingEnrollmentUseCase
      .execute({
        userId: currentUser.id,
        locale,
        scheduleId,
        payload: body,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get('enrollments/:id/pay/redirect')
  @ApiOperation({
    summary: 'Create a fresh payment checkout redirect for a training enrollment',
  })
  async redirectToEnrollmentPayment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') enrollmentId: string,
    @Query() query: TrainingEnrollmentPaymentRedirectQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const result =
      await this.getPatientTrainingEnrollmentPaymentRedirectUseCase.execute({
        userId: currentUser.id,
        locale,
        enrollmentId,
        returnUrl: query.returnUrl ?? null,
        callerSurfaceUrl: this.resolveCallerSurfaceUrl(request),
      });

    response
      .status(302)
      .setHeader('Location', result.redirectUrl)
      .setHeader('Cache-Control', 'no-store, max-age=0')
      .setHeader('Pragma', 'no-cache')
      .end();
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'List patient-owned training enrollments' })
  @ApiResponse({
    status: 200,
    type: PatientTrainingEnrollmentListSuccessResponseDto,
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: ListPatientTrainingEnrollmentsDto,
  ) {
    return this.listPatientTrainingEnrollmentsUseCase
      .execute({
        userId: currentUser.id,
        locale,
        query,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get('enrollments/:id')
  @ApiOperation({ summary: 'Get patient-owned training enrollment details' })
  @ApiResponse({
    status: 200,
    type: PatientTrainingEnrollmentItemSuccessResponseDto,
  })
  get(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') enrollmentId: string,
  ) {
    return this.getPatientTrainingEnrollmentUseCase
      .execute({
        userId: currentUser.id,
        locale,
        enrollmentId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  @Get('enrollments/:id/join-access')
  @ApiOperation({ summary: 'Resolve patient training join access contract' })
  @ApiResponse({
    status: 200,
    type: PatientTrainingJoinAccessItemSuccessResponseDto,
  })
  resolveJoinAccess(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') enrollmentId: string,
  ) {
    return this.resolvePatientTrainingJoinAccessUseCase
      .execute({
        userId: currentUser.id,
        locale,
        enrollmentId,
      })
      .then((data) => ({ success: true as const, data }));
  }

  private resolveCallerSurfaceUrl(request: Request): string | null {
    const headerCandidates = [
      request.headers.origin,
      request.headers.referer,
      request.headers.referrer,
    ].filter((value): value is string => typeof value === 'string');

    for (const candidate of headerCandidates) {
      try {
        const parsed = new URL(candidate);

        if (parsed.protocol === 'fayed:') {
          return parsed.toString();
        }

        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return parsed.origin;
        }
      } catch {
        // Ignore invalid headers and continue scanning.
      }
    }

    return null;
  }
}

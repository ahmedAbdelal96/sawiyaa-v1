import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
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
import { ListPatientAcademyProgramEnrollmentsDto } from '../dto/list-patient-academy-program-enrollments.dto';
import { PatientAcademyProgramEnrollmentPaymentRedirectQueryDto } from '../dto/patient-academy-program-enrollment-payment-redirect.dto';
import { GetPatientAcademyProgramEnrollmentPaymentRedirectUseCase } from '../use-cases/get-patient-academy-program-enrollment-payment-redirect.use-case';
import { GetAcademyProgramEnrollmentCertificateFileUseCase } from '../use-cases/get-academy-program-enrollment-certificate-file.use-case';
import { GetPatientAcademyProgramEnrollmentUseCase } from '../use-cases/get-patient-academy-program-enrollment.use-case';
import { ListPatientAcademyProgramEnrollmentsUseCase } from '../use-cases/list-patient-academy-program-enrollments.use-case';

@ApiTags('Academy')
@ApiBearerAuth()
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.PATIENT)
@Controller('patients/me/academy')
export class PatientAcademyProgramsController {
  constructor(
    private readonly listPatientAcademyProgramEnrollmentsUseCase: ListPatientAcademyProgramEnrollmentsUseCase,
    private readonly getPatientAcademyProgramEnrollmentUseCase: GetPatientAcademyProgramEnrollmentUseCase,
    private readonly getPatientAcademyProgramEnrollmentPaymentRedirectUseCase: GetPatientAcademyProgramEnrollmentPaymentRedirectUseCase,
    private readonly getAcademyProgramEnrollmentCertificateFileUseCase: GetAcademyProgramEnrollmentCertificateFileUseCase,
  ) {}

  @Get('program-enrollments')
  @ApiOperation({ summary: 'List patient-owned academy program enrollments' })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: ListPatientAcademyProgramEnrollmentsDto,
  ) {
    return this.listPatientAcademyProgramEnrollmentsUseCase.execute({
      userId: currentUser.id,
      locale,
      query,
    });
  }

  @Get('program-enrollments/:id')
  @ApiOperation({ summary: 'Get patient-owned academy program enrollment details' })
  get(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') enrollmentId: string,
  ) {
    return this.getPatientAcademyProgramEnrollmentUseCase.execute({
      userId: currentUser.id,
      locale,
      enrollmentId,
    });
  }

  @Get('program-enrollments/:id/certificate')
  @ApiOperation({
    summary: 'Get patient-owned academy program enrollment certificate PDF',
  })
  async getCertificate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') enrollmentId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file =
      await this.getAcademyProgramEnrollmentCertificateFileUseCase.execute({
        enrollmentId,
        userId: currentUser.id,
      });

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${file.originalFileName?.replace(/"/g, "'") ?? 'certificate.pdf'}"`,
    );

    return new StreamableFile(createReadStream(file.absolutePath));
  }

  @Get('program-enrollments/:id/pay/redirect')
  @ApiOperation({
    summary:
      'Create a fresh payment checkout redirect for a patient-owned academy program enrollment',
  })
  async redirectToEnrollmentPayment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @CurrentLocale() locale: SupportedLocale,
    @Param('id') enrollmentId: string,
    @Query() query: PatientAcademyProgramEnrollmentPaymentRedirectQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const result =
      await this.getPatientAcademyProgramEnrollmentPaymentRedirectUseCase.execute(
        {
          userId: currentUser.id,
          enrollmentId,
          locale,
          returnUrl: query.returnUrl ?? null,
          callerSurfaceUrl: this.resolveCallerSurfaceUrl(request),
        },
      );

    response
      .status(302)
      .setHeader('Location', result.redirectUrl)
      .setHeader('Cache-Control', 'no-store, max-age=0')
      .setHeader('Pragma', 'no-cache')
      .end();
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

        if (parsed.protocol === 'sawiyaa:') {
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

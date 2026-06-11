import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { ThrottlePolicy } from '@common/decorators/throttle-policy.decorator';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { Request, Response } from 'express';
import { AcademyEnrollmentTokenDto } from '../dto/academy-enrollment-token.dto';
import { AcademyEnrollmentPaymentRedirectQueryDto } from '../dto/academy-enrollment-payment-redirect.dto';
import { CreateAcademyEnrollmentDto } from '../dto/create-academy-enrollment.dto';
import { ListPublicAcademyCoursesDto } from '../dto/list-public-academy-courses.dto';
import { GetPublicAcademyCourseBySlugUseCase } from '../use-cases/get-public-academy-course-by-slug.use-case';
import { GetPublicAcademyEnrollmentPaymentRedirectUseCase } from '../use-cases/get-public-academy-enrollment-payment-redirect.use-case';
import { GetPublicAcademyEnrollmentUseCase } from '../use-cases/get-public-academy-enrollment.use-case';
import { CreateAcademyEnrollmentUseCase } from '../use-cases/create-academy-enrollment.use-case';
import { ListPublicAcademyCoursesUseCase } from '../use-cases/list-public-academy-courses.use-case';

@ApiTags('Academy')
@Controller('academy')
export class PublicAcademyController {
  constructor(
    private readonly listPublicAcademyCoursesUseCase: ListPublicAcademyCoursesUseCase,
    private readonly getPublicAcademyCourseBySlugUseCase: GetPublicAcademyCourseBySlugUseCase,
    private readonly createAcademyEnrollmentUseCase: CreateAcademyEnrollmentUseCase,
    private readonly getPublicAcademyEnrollmentUseCase: GetPublicAcademyEnrollmentUseCase,
    private readonly getPublicAcademyEnrollmentPaymentRedirectUseCase: GetPublicAcademyEnrollmentPaymentRedirectUseCase,
  ) {}

  @Get('courses')
  @ApiOperation({ summary: 'List published academy courses' })
  list(
    @Query() query: ListPublicAcademyCoursesDto,
    @CurrentUser() currentUser: AuthenticatedUser | null,
  ) {
    return this.listPublicAcademyCoursesUseCase.execute({
      ...query,
      currentUserId: currentUser?.id ?? null,
    });
  }

  @Get('courses/:slug')
  @ApiOperation({ summary: 'Get published academy course by slug' })
  getBySlug(
    @Param('slug') slug: string,
    @CurrentUser() currentUser: AuthenticatedUser | null,
  ) {
    return this.getPublicAcademyCourseBySlugUseCase.execute({
      slug,
      currentUserId: currentUser?.id ?? null,
    });
  }

  @Post('courses/:slug/enrollments')
  @ThrottlePolicy('academy-public-enrollment')
  @ApiOperation({ summary: 'Create a public academy enrollment' })
  createEnrollment(
    @Param('slug') slug: string,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: CreateAcademyEnrollmentDto,
  ) {
    return this.createAcademyEnrollmentUseCase.execute({
      slug,
      locale,
      payload: body,
    });
  }

  @Get('enrollments/:id')
  @ApiOperation({ summary: 'Get academy enrollment status by public token' })
  getEnrollment(
    @Param('id') enrollmentId: string,
    @Query() query: AcademyEnrollmentTokenDto,
  ) {
    return this.getPublicAcademyEnrollmentUseCase.execute({
      enrollmentId,
      token: query.token ?? '',
    });
  }

  @Get('enrollments/:id/pay/redirect')
  @ApiOperation({
    summary: 'Create a fresh payment checkout redirect for a public enrollment',
  })
  async redirectToEnrollmentPayment(
    @Param('id') enrollmentId: string,
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: AcademyEnrollmentPaymentRedirectQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const result =
      await this.getPublicAcademyEnrollmentPaymentRedirectUseCase.execute({
        enrollmentId,
        token: query.token ?? '',
        returnUrl: query.returnUrl ?? null,
        callerSurfaceUrl: this.resolveCallerSurfaceUrl(request),
        locale,
      });

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

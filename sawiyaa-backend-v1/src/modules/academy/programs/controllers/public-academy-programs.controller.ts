import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentLocale } from '@common/i18n/decorators/current-locale.decorator';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { Request, Response } from 'express';
import { AcademyProgramEnrollmentPaymentRedirectQueryDto } from '../dto/academy-program-enrollment-payment-redirect.dto';
import { AcademyProgramEnrollmentTokenDto } from '../dto/academy-program-enrollment-token.dto';
import { CreateAcademyProgramEnrollmentDto } from '../dto/create-academy-program-enrollment.dto';
import { ListPublicAcademyProgramsDto } from '../dto/list-public-academy-programs.dto';
import { CreateAcademyProgramEnrollmentUseCase } from '../use-cases/create-academy-program-enrollment.use-case';
import { GetPublicAcademyProgramBySlugUseCase } from '../use-cases/get-public-academy-program-by-slug.use-case';
import { GetPublicAcademyProgramEnrollmentPaymentRedirectUseCase } from '../use-cases/get-public-academy-program-enrollment-payment-redirect.use-case';
import { GetPublicAcademyProgramEnrollmentUseCase } from '../use-cases/get-public-academy-program-enrollment.use-case';
import { ListPublicAcademyProgramsUseCase } from '../use-cases/list-public-academy-programs.use-case';
import { AcademyProgramCoverStorageService } from '../services/academy-program-cover-storage.service';

@ApiTags('Academy')
@Controller('academy')
export class PublicAcademyProgramsController {
  constructor(
    private readonly listPublicAcademyProgramsUseCase: ListPublicAcademyProgramsUseCase,
    private readonly getPublicAcademyProgramBySlugUseCase: GetPublicAcademyProgramBySlugUseCase,
    private readonly createAcademyProgramEnrollmentUseCase: CreateAcademyProgramEnrollmentUseCase,
    private readonly getPublicAcademyProgramEnrollmentUseCase: GetPublicAcademyProgramEnrollmentUseCase,
    private readonly getPublicAcademyProgramEnrollmentPaymentRedirectUseCase: GetPublicAcademyProgramEnrollmentPaymentRedirectUseCase,
    private readonly academyProgramCoverStorageService: AcademyProgramCoverStorageService,
  ) {}

  @Get('program-covers/:fileName')
  @Public()
  @ApiOperation({ summary: 'Get academy program cover image' })
  async getProgramCover(
    @Param('fileName') fileName: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.academyProgramCoverStorageService.getCoverFile(fileName);
    if (!file) {
      throw new NotFoundException({
        messageKey: 'common.errors.notFound',
        error: 'NOT_FOUND',
      });
    }

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Cache-Control', 'public, max-age=86400');

    return new StreamableFile(
      this.academyProgramCoverStorageService.createFileStream(file.absolutePath),
    );
  }

  @Get('programs')
  @Public()
  @ApiOperation({ summary: 'List published academy programs' })
  list(
    @Query() query: ListPublicAcademyProgramsDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.listPublicAcademyProgramsUseCase.execute({
      ...query,
      locale,
    });
  }

  @Get('programs/:slug')
  @Public()
  @ApiOperation({ summary: 'Get published academy program by slug' })
  getBySlug(
    @Param('slug') slug: string,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getPublicAcademyProgramBySlugUseCase.execute({
      slug,
      locale,
    });
  }

  @Public()
  @Post('programs/:slug/enrollments')
  @ApiOperation({ summary: 'Create a public academy program enrollment' })
  createEnrollment(
    @Param('slug') slug: string,
    @CurrentLocale() locale: SupportedLocale,
    @Body() body: CreateAcademyProgramEnrollmentDto,
    @CurrentUser() currentUser: AuthenticatedUser | null,
  ) {
    return this.createAcademyProgramEnrollmentUseCase.execute({
      slug,
      locale,
      currentUser: currentUser ?? null,
      payload: body,
    });
  }

  @Get('program-enrollments/:id')
  @Public()
  @ApiOperation({ summary: 'Get academy program enrollment status by public token' })
  getEnrollment(
    @Param('id') enrollmentId: string,
    @Query() query: AcademyProgramEnrollmentTokenDto,
    @CurrentLocale() locale: SupportedLocale,
  ) {
    return this.getPublicAcademyProgramEnrollmentUseCase.execute({
      enrollmentId,
      token: query.token ?? '',
      locale,
    });
  }

  @Get('program-enrollments/:id/pay/redirect')
  @Public()
  @ApiOperation({
    summary:
      'Create a fresh payment checkout redirect for a public academy program enrollment',
  })
  async redirectToEnrollmentPayment(
    @Param('id') enrollmentId: string,
    @CurrentLocale() locale: SupportedLocale,
    @Query() query: AcademyProgramEnrollmentPaymentRedirectQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const result =
      await this.getPublicAcademyProgramEnrollmentPaymentRedirectUseCase.execute(
        {
          enrollmentId,
          token: query.token ?? '',
          returnUrl: query.returnUrl ?? null,
          callerSurfaceUrl: this.resolveCallerSurfaceUrl(request),
          locale,
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

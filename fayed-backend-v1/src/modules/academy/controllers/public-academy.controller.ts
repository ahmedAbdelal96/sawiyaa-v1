import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { AcademyEnrollmentTokenDto } from '../dto/academy-enrollment-token.dto';
import { CreateAcademyEnrollmentDto } from '../dto/create-academy-enrollment.dto';
import { ListPublicAcademyCoursesDto } from '../dto/list-public-academy-courses.dto';
import { GetPublicAcademyCourseBySlugUseCase } from '../use-cases/get-public-academy-course-by-slug.use-case';
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
  @ApiOperation({ summary: 'Create a public academy enrollment' })
  createEnrollment(
    @Param('slug') slug: string,
    @Body() body: CreateAcademyEnrollmentDto,
  ) {
    return this.createAcademyEnrollmentUseCase.execute({
      slug,
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
}

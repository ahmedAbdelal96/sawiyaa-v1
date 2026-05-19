import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireAccountStates } from '@common/decorators/account-state.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AccountStateRequirement } from '@common/enums/account-state-requirement.enum';
import { AppRole } from '@common/enums/app-role.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { CreateAcademyCourseDto } from '../dto/create-academy-course.dto';
import { CreateAcademyCourseLectureDto } from '../dto/create-academy-course-lecture.dto';
import { ListAdminAcademyCoursesDto } from '../dto/list-admin-academy-courses.dto';
import { ListAdminAcademyEnrollmentsDto } from '../dto/list-admin-academy-enrollments.dto';
import { UpdateAcademyCourseDto } from '../dto/update-academy-course.dto';
import { ArchiveAcademyCourseUseCase } from '../use-cases/archive-academy-course.use-case';
import { CreateAcademyCourseUseCase } from '../use-cases/create-academy-course.use-case';
import { CreateAcademyCourseLectureUseCase } from '../use-cases/create-academy-course-lecture.use-case';
import { GetAdminAcademyCourseUseCase } from '../use-cases/get-admin-academy-course.use-case';
import { ListAdminAcademyCoursesUseCase } from '../use-cases/list-admin-academy-courses.use-case';
import { ListAdminAcademyEnrollmentsUseCase } from '../use-cases/list-admin-academy-enrollments.use-case';
import { PublishAcademyCourseUseCase } from '../use-cases/publish-academy-course.use-case';
import { UpdateAcademyCourseUseCase } from '../use-cases/update-academy-course.use-case';

@ApiTags('Academy')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)
@Roles(AppRole.ADMIN)
@Controller('admin/academy')
export class AdminAcademyController {
  constructor(
    private readonly listAdminAcademyCoursesUseCase: ListAdminAcademyCoursesUseCase,
    private readonly getAdminAcademyCourseUseCase: GetAdminAcademyCourseUseCase,
    private readonly listAdminAcademyEnrollmentsUseCase: ListAdminAcademyEnrollmentsUseCase,
    private readonly createAcademyCourseUseCase: CreateAcademyCourseUseCase,
    private readonly createAcademyCourseLectureUseCase: CreateAcademyCourseLectureUseCase,
    private readonly updateAcademyCourseUseCase: UpdateAcademyCourseUseCase,
    private readonly publishAcademyCourseUseCase: PublishAcademyCourseUseCase,
    private readonly archiveAcademyCourseUseCase: ArchiveAcademyCourseUseCase,
  ) {}

  @Get('courses')
  @ApiOperation({ summary: 'List academy courses for admin management' })
  listCourses(@Query() query: ListAdminAcademyCoursesDto) {
    return this.listAdminAcademyCoursesUseCase.execute(query);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Get academy course details for admin management' })
  getCourse(@Param('id') courseId: string) {
    return this.getAdminAcademyCourseUseCase.execute({ courseId });
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'List academy enrollments for admin management' })
  listEnrollments(@Query() query: ListAdminAcademyEnrollmentsDto) {
    return this.listAdminAcademyEnrollmentsUseCase.execute(query);
  }

  @Post('courses')
  @ApiOperation({ summary: 'Create academy course draft' })
  createCourse(@Body() body: CreateAcademyCourseDto) {
    return this.createAcademyCourseUseCase.execute({ payload: body });
  }

  @Patch('courses/:id')
  @ApiOperation({ summary: 'Update academy course' })
  updateCourse(
    @Param('id') courseId: string,
    @Body() body: UpdateAcademyCourseDto,
  ) {
    return this.updateAcademyCourseUseCase.execute({ courseId, payload: body });
  }

  @Post('courses/:id/lectures')
  @ApiOperation({ summary: 'Create academy course lecture' })
  createCourseLecture(
    @Param('id') courseId: string,
    @Body() body: CreateAcademyCourseLectureDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.createAcademyCourseLectureUseCase.execute({
      courseId,
      createdByUserId: currentUser.id,
      payload: body,
    });
  }

  @Patch('courses/:id/publish')
  @ApiOperation({ summary: 'Publish academy course' })
  publishCourse(@Param('id') courseId: string) {
    return this.publishAcademyCourseUseCase.execute({ courseId });
  }

  @Patch('courses/:id/archive')
  @ApiOperation({ summary: 'Archive academy course' })
  archiveCourse(@Param('id') courseId: string) {
    return this.archiveAcademyCourseUseCase.execute({ courseId });
  }
}

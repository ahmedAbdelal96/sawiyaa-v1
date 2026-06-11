import { Module } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { PaymentsModule } from '@modules/payments/payments.module';
import { PatientsModule } from '@modules/patients/patients.module';
import { AdminAcademyController } from './controllers/admin-academy.controller';
import { PublicAcademyController } from './controllers/public-academy.controller';
import { AcademyPresenter } from './presenters/academy.presenter';
import { AcademyRepository } from './repositories/academy.repository';
import { ArchiveAcademyCourseUseCase } from './use-cases/archive-academy-course.use-case';
import { CreateAcademyCourseUseCase } from './use-cases/create-academy-course.use-case';
import { CreateAcademyCourseLectureUseCase } from './use-cases/create-academy-course-lecture.use-case';
import { CreateAcademyEnrollmentUseCase } from './use-cases/create-academy-enrollment.use-case';
import { GetAdminAcademyCourseUseCase } from './use-cases/get-admin-academy-course.use-case';
import { GetPublicAcademyCourseBySlugUseCase } from './use-cases/get-public-academy-course-by-slug.use-case';
import { GetPublicAcademyEnrollmentPaymentRedirectUseCase } from './use-cases/get-public-academy-enrollment-payment-redirect.use-case';
import { GetPublicAcademyEnrollmentUseCase } from './use-cases/get-public-academy-enrollment.use-case';
import { ListAdminAcademyCoursesUseCase } from './use-cases/list-admin-academy-courses.use-case';
import { ListAdminAcademyEnrollmentsUseCase } from './use-cases/list-admin-academy-enrollments.use-case';
import { ListPublicAcademyCoursesUseCase } from './use-cases/list-public-academy-courses.use-case';
import { PublishAcademyCourseUseCase } from './use-cases/publish-academy-course.use-case';
import { UpdateAcademyCourseUseCase } from './use-cases/update-academy-course.use-case';

@Module({
  imports: [PaymentsModule, PatientsModule],
  controllers: [PublicAcademyController, AdminAcademyController],
  providers: [
    JwtAccessAuthGuard,
    RolesGuard,
    AcademyPresenter,
    AcademyRepository,
    ListPublicAcademyCoursesUseCase,
    GetPublicAcademyCourseBySlugUseCase,
    GetPublicAcademyEnrollmentUseCase,
    GetPublicAcademyEnrollmentPaymentRedirectUseCase,
    CreateAcademyEnrollmentUseCase,
    ListAdminAcademyCoursesUseCase,
    GetAdminAcademyCourseUseCase,
    ListAdminAcademyEnrollmentsUseCase,
    CreateAcademyCourseUseCase,
    CreateAcademyCourseLectureUseCase,
    UpdateAcademyCourseUseCase,
    PublishAcademyCourseUseCase,
    ArchiveAcademyCourseUseCase,
  ],
})
export class AcademyModule {}

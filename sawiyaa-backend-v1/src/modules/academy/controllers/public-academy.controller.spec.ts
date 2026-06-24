import { ListPublicAcademyCoursesUseCase } from '../use-cases/list-public-academy-courses.use-case';
import { GetPublicAcademyCourseBySlugUseCase } from '../use-cases/get-public-academy-course-by-slug.use-case';
import { CreateAcademyEnrollmentUseCase } from '../use-cases/create-academy-enrollment.use-case';
import { GetPublicAcademyEnrollmentUseCase } from '../use-cases/get-public-academy-enrollment.use-case';
import { GetPublicAcademyEnrollmentPaymentRedirectUseCase } from '../use-cases/get-public-academy-enrollment-payment-redirect.use-case';
import { PublicAcademyController } from './public-academy.controller';

describe('PublicAcademyController', () => {
  const listPublicAcademyCoursesUseCase = {} as ListPublicAcademyCoursesUseCase;
  const getPublicAcademyCourseBySlugUseCase =
    {} as GetPublicAcademyCourseBySlugUseCase;
  const createAcademyEnrollmentUseCase =
    {} as CreateAcademyEnrollmentUseCase;
  const getPublicAcademyEnrollmentUseCase =
    {} as GetPublicAcademyEnrollmentUseCase;
  const getPublicAcademyEnrollmentPaymentRedirectUseCase = {
    execute: jest.fn(),
  } as unknown as GetPublicAcademyEnrollmentPaymentRedirectUseCase;

  const controller = new PublicAcademyController(
    listPublicAcademyCoursesUseCase,
    getPublicAcademyCourseBySlugUseCase,
    createAcademyEnrollmentUseCase,
    getPublicAcademyEnrollmentUseCase,
    getPublicAcademyEnrollmentPaymentRedirectUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a header-only 302 redirect for the payment redirect endpoint', async () => {
    (getPublicAcademyEnrollmentPaymentRedirectUseCase.execute as jest.Mock).mockResolvedValue(
      {
        redirectUrl: 'https://paymob.example/checkout/fresh',
      },
    );

    const response = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn(),
    } as unknown as {
      status: jest.Mock;
      setHeader: jest.Mock;
      end: jest.Mock;
    };

    await controller.redirectToEnrollmentPayment(
      'enrollment_1',
      'ar',
      {
        token: 'public-token',
        returnUrl:
          'sawiyaa://academy/enrollments/enrollment_1/payment-return?token=public-token',
      } as never,
      {
        headers: {
          origin: 'http://localhost:8081',
        },
      } as never,
      response as never,
    );

    expect(response.status).toHaveBeenCalledWith(302);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Location',
      'https://paymob.example/checkout/fresh',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store, max-age=0',
    );
    expect(response.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(response.end).toHaveBeenCalledWith();
  });
});

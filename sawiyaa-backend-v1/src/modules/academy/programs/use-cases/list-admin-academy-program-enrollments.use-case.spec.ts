import { ListAdminAcademyProgramEnrollmentsUseCase } from './list-admin-academy-program-enrollments.use-case';

describe('ListAdminAcademyProgramEnrollmentsUseCase', () => {
  it('returns only the requested training registrations with contact and status projection', async () => {
    const repository = {
      listAdminEnrollments: jest.fn().mockResolvedValue([
        [
          { id: 'enrollment-a', status: 'CONFIRMED', paymentStatus: 'CAPTURED' },
        ],
        1,
      ]),
    };
    const presenter = {
      presentAdminEnrollmentListItem: jest.fn().mockReturnValue({
        id: 'enrollment-a',
        learner: {
          fullName: 'Mona Ali',
          phoneNumber: '+201000000000',
          email: 'mona@example.com',
        },
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
      }),
    };
    const programPresenter = {
      presentPagination: jest.fn().mockReturnValue({
        page: 1,
        limit: 12,
        totalItems: 1,
        totalPages: 1,
      }),
    };
    const useCase = new ListAdminAcademyProgramEnrollmentsUseCase(
      repository as never,
      presenter as never,
      programPresenter as never,
    );

    const result = await useCase.execute({
      academyProgramId: 'program-a',
      locale: 'en',
      page: 1,
      limit: 12,
      q: 'Mona',
    } as never);

    expect(repository.listAdminEnrollments).toHaveBeenCalledWith({
      academyProgramId: 'program-a',
      page: 1,
      limit: 12,
      status: undefined,
      paymentStatus: undefined,
      country: undefined,
      sortBy: undefined,
      sortDir: undefined,
      q: 'Mona',
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        learner: expect.objectContaining({
          fullName: 'Mona Ali',
          phoneNumber: '+201000000000',
          email: 'mona@example.com',
        }),
        status: 'CONFIRMED',
        paymentStatus: 'CAPTURED',
      }),
    );
  });

  it('preserves cancelled registrations and paid-state projections', async () => {
    const repository = {
      listAdminEnrollments: jest.fn().mockResolvedValue([
        [{ id: 'enrollment-cancelled', status: 'CANCELLED', paymentStatus: 'REFUNDED' }],
        1,
      ]),
    };
    const presenter = {
      presentAdminEnrollmentListItem: jest.fn().mockReturnValue({
        id: 'enrollment-cancelled',
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED',
      }),
    };
    const programPresenter = {
      presentPagination: jest.fn().mockReturnValue({ page: 1, limit: 12, totalItems: 1, totalPages: 1 }),
    };
    const useCase = new ListAdminAcademyProgramEnrollmentsUseCase(
      repository as never,
      presenter as never,
      programPresenter as never,
    );

    const result = await useCase.execute({
      academyProgramId: 'program-a',
      locale: 'ar',
      status: 'CANCELLED',
      paymentStatus: 'REFUNDED',
    } as never);

    expect(result.items[0]).toEqual(
      expect.objectContaining({ status: 'CANCELLED', paymentStatus: 'REFUNDED' }),
    );
  });
});

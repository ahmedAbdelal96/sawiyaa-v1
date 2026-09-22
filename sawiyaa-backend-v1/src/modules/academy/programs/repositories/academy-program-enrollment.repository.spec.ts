import { AcademyProgramEnrollmentRepository } from './academy-program-enrollment.repository';

describe('AcademyProgramEnrollmentRepository admin listing', () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const prisma = {
    academyProgramEnrollment: { findMany, count },
  } as never;
  const repository = new AcademyProgramEnrollmentRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
  });

  it('scopes registrations to the requested training and paginates newest first', async () => {
    await repository.listAdminEnrollments({
      academyProgramId: 'program-a',
      page: 2,
      limit: 25,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ academyProgramId: 'program-a' }] },
        skip: 25,
        take: 25,
        orderBy: [{ registeredAt: 'desc' }, { contactFullName: 'asc' }],
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: { AND: [{ academyProgramId: 'program-a' }] },
    });
  });

  it('forwards name, phone, email, status, and payment filters without widening the training scope', async () => {
    await repository.listAdminEnrollments({
      academyProgramId: 'program-a',
      page: 1,
      limit: 12,
      q: 'Mona',
      status: 'CANCELLED' as never,
      paymentStatus: 'REFUNDED' as never,
    });

    const call = findMany.mock.calls[0][0];
    expect(call.where.AND).toEqual(
      expect.arrayContaining([
        { academyProgramId: 'program-a' },
        { status: 'CANCELLED' },
        { paymentStatus: 'REFUNDED' },
        expect.objectContaining({ OR: expect.any(Array) }),
      ]),
    );
    const searchCondition = call.where.AND.find(
      (condition: { OR?: unknown[] }) => Array.isArray(condition.OR),
    );
    expect(searchCondition.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ contactFullName: expect.any(Object) }),
        expect.objectContaining({ contactPhone: expect.any(Object) }),
        expect.objectContaining({ contactEmail: expect.any(Object) }),
      ]),
    );
  });

  it('supports phone/email search, country filtering, and explicit oldest-first sorting', async () => {
    await repository.listAdminEnrollments({
      academyProgramId: 'program-b',
      page: 1,
      limit: 10,
      q: '+2010',
      country: 'eg',
      sortBy: 'name',
      sortDir: 'asc',
    });

    const call = findMany.mock.calls[0][0];
    expect(call.where.AND).toEqual(
      expect.arrayContaining([
        { academyProgramId: 'program-b' },
        expect.objectContaining({ OR: expect.any(Array) }),
      ]),
    );
    expect(call.orderBy).toEqual([
      { contactFullName: 'asc' },
      { registeredAt: 'desc' },
    ]);
  });

  it('keeps one canonical enrollment row per learner through the database query', async () => {
    await repository.listAdminEnrollments({
      academyProgramId: 'program-a',
      page: 1,
      limit: 12,
    });

    expect(findMany.mock.calls[0][0].include).toEqual(
      expect.objectContaining({
        academyProgram: expect.any(Object),
        academyLearner: expect.any(Object),
        payment: expect.any(Object),
      }),
    );
    expect(findMany.mock.calls[0][0].distinct).toBeUndefined();
  });

  it('exports every matching enrollment and preserves the active filters without page limits', async () => {
    await repository.findAdminEnrollmentsForExport({
      academyProgramId: 'program-a',
      q: 'sara@example.com',
      country: 'EG',
      status: 'CONFIRMED' as never,
      paymentStatus: 'CAPTURED' as never,
    });

    const call = findMany.mock.calls[0][0];
    expect(call.where.AND).toEqual(
      expect.arrayContaining([
        { academyProgramId: 'program-a' },
        { status: 'CONFIRMED' },
        { paymentStatus: 'CAPTURED' },
        expect.objectContaining({ OR: expect.any(Array) }),
      ]),
    );
    expect(call).not.toHaveProperty('skip');
    expect(call).not.toHaveProperty('take');
  });
});

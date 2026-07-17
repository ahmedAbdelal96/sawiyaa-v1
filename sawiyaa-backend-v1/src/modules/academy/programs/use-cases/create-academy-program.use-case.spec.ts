import { CreateAcademyProgramUseCase } from './create-academy-program.use-case';

describe('CreateAcademyProgramUseCase', () => {
  it('defaults registration to open when it is not provided', async () => {
    const repository = {
      findCategoryById: jest.fn().mockResolvedValue({ id: 'cat-1' }),
      findProgramBySlug: jest
        .fn()
        .mockResolvedValueOnce({ id: 'other-program' })
        .mockResolvedValueOnce(null),
      createProgram: jest.fn().mockResolvedValue({
        id: 'program-1',
        slug: 'academy-program-2',
        titleAr: 'Academy Course',
        titleEn: 'Academy Course',
        descriptionAr: null,
        descriptionEn: null,
        coverImageUrl: null,
        categoryId: 'cat-1',
        priceEgp: { toString: () => '500.00' },
        priceUsd: null,
        registrationOpen: true,
        maxSeats: null,
        startAt: null,
        endAt: null,
        status: 'DRAFT',
        publishedAt: null,
        archivedAt: null,
        createdByUserId: 'user-1',
        createdAt: new Date('2026-07-04T08:00:00.000Z'),
        updatedAt: new Date('2026-07-04T08:00:00.000Z'),
      }),
    } as any;
    const presenter = {
      presentAdminProgramDetails: jest.fn().mockReturnValue({
        id: 'program-1',
        slug: 'academy-program-2',
      }),
    } as any;

    const useCase = new CreateAcademyProgramUseCase(repository, presenter);
    const result = await useCase.execute({
      createdByUserId: 'user-1',
      payload: {
        titleAr: 'Academy Course',
        titleEn: 'Academy Course',
        descriptionAr: 'Arabic description',
        descriptionEn: 'English description',
        slug: 'Academy Program',
        priceEgp: '500',
        priceUsd: '25',
        categoryId: 'cat-1',
        startAt: '2026-07-04T09:00:00.000Z',
        endAt: '2026-07-04T10:00:00.000Z',
      },
    });

    expect(repository.createProgram).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'academy-program-2',
        titleAr: 'Academy Course',
        titleEn: 'Academy Course',
        priceEgp: '500.00',
        priceUsd: '25.00',
        registrationOpen: true,
        status: 'DRAFT',
        createdByUserId: 'user-1',
      }),
    );
    expect(result).toEqual({ item: { id: 'program-1', slug: 'academy-program-2' } });
  });

  it('preserves an explicit closed registration value', async () => {
    const repository = {
      findCategoryById: jest.fn().mockResolvedValue({ id: 'cat-1' }),
      findProgramBySlug: jest.fn().mockResolvedValue(null),
      createProgram: jest.fn().mockResolvedValue({
        id: 'program-1',
        slug: 'academy-program',
        titleAr: 'Academy Course',
        titleEn: 'Academy Course',
        descriptionAr: null,
        descriptionEn: null,
        coverImageUrl: null,
        categoryId: 'cat-1',
        priceEgp: { toString: () => '500.00' },
        priceUsd: { toString: () => '25.00' },
        registrationOpen: false,
        maxSeats: null,
        startAt: null,
        endAt: null,
        status: 'DRAFT',
        publishedAt: null,
        archivedAt: null,
        createdByUserId: 'user-1',
        createdAt: new Date('2026-07-04T08:00:00.000Z'),
        updatedAt: new Date('2026-07-04T08:00:00.000Z'),
      }),
    } as any;
    const presenter = {
      presentAdminProgramDetails: jest.fn().mockReturnValue({
        id: 'program-1',
        slug: 'academy-program',
      }),
    } as any;

    const useCase = new CreateAcademyProgramUseCase(repository, presenter);
    await useCase.execute({
      createdByUserId: 'user-1',
      payload: {
        titleAr: 'Academy Course',
        titleEn: 'Academy Course',
        descriptionAr: 'Arabic description',
        descriptionEn: 'English description',
        priceEgp: '500',
        priceUsd: '25',
        categoryId: 'cat-1',
        registrationOpen: false,
        startAt: '2026-07-04T09:00:00.000Z',
        endAt: '2026-07-04T10:00:00.000Z',
      },
    });

    expect(repository.createProgram).toHaveBeenCalledWith(
      expect.objectContaining({
        registrationOpen: false,
      }),
    );
  });

  it('couples program creation to a required audit event when runtime services are present', async () => {
    const repository = {
      findCategoryById: jest.fn().mockResolvedValue(null),
      findProgramBySlug: jest.fn().mockResolvedValue(null),
      createProgram: jest.fn().mockResolvedValue({
        id: 'program-1',
        slug: 'academy-course',
        titleAr: 'Course Ar',
        titleEn: 'Course',
        descriptionAr: 'Description Ar',
        descriptionEn: 'Description',
        coverImageUrl: null,
        categoryId: null,
        priceEgp: '0.00',
        priceUsd: '0.00',
        registrationOpen: true,
        maxSeats: null,
        startAt: new Date('2026-07-04T09:00:00.000Z'),
        endAt: new Date('2026-07-04T10:00:00.000Z'),
        status: 'DRAFT',
        publishedAt: null,
        archivedAt: null,
        createdByUserId: 'user-1',
      }),
    } as any;
    const presenter = { presentAdminProgramDetails: jest.fn().mockReturnValue({ id: 'program-1' }) } as any;
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: object) => unknown) => callback({})),
    } as any;
    const securityAuditService = { recordRequired: jest.fn().mockResolvedValue(undefined) } as any;

    const useCase = new CreateAcademyProgramUseCase(
      repository,
      presenter,
      prisma,
      securityAuditService,
    );

    await useCase.execute({
      createdByUserId: 'user-1',
      actorRoles: ['ADMIN'],
      payload: {
        titleAr: 'Course Ar',
        titleEn: 'Course',
        descriptionAr: 'Description Ar',
        descriptionEn: 'Description',
        priceEgp: '0',
        priceUsd: '0',
        startAt: '2026-07-04T09:00:00.000Z',
        endAt: '2026-07-04T10:00:00.000Z',
      },
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(repository.createProgram).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
    expect(securityAuditService.recordRequired).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ action: 'academy.program.create', resourceId: 'program-1' }),
    );
  });
});

import { CreateAcademyProgramSessionUseCase } from './create-academy-program-session.use-case';

describe('CreateAcademyProgramSessionUseCase', () => {
  it('creates a session and assigns publishedAt only when published', async () => {
    const repository = {
      findProgramById: jest.fn().mockResolvedValue({ id: 'program-1' }),
      createSession: jest.fn().mockResolvedValue({
        id: 'session-1',
        titleAr: 'جلسة افتتاحية',
        titleEn: 'Opening Session',
        descriptionAr: null,
        descriptionEn: null,
        startsAt: new Date('2026-07-04T10:00:00.000Z'),
        endsAt: new Date('2026-07-04T11:00:00.000Z'),
        deliveryMethod: 'ZOOM',
        internalDeliveryNote: null,
        internalDeliveryLink: null,
        sortOrder: 1,
        isPublished: true,
        publishedAt: new Date('2026-07-04T09:00:00.000Z'),
        createdByUserId: 'user-1',
        createdAt: new Date('2026-07-04T08:00:00.000Z'),
        updatedAt: new Date('2026-07-04T08:00:00.000Z'),
      }),
    } as any;
    const presenter = {
      presentAdminSessionItem: jest.fn().mockReturnValue({
        id: 'session-1',
        isPublished: true,
      }),
    } as any;

    const useCase = new CreateAcademyProgramSessionUseCase(repository, presenter);
    const result = await useCase.execute({
      programId: 'program-1',
      createdByUserId: 'user-1',
      payload: {
        titleAr: 'جلسة افتتاحية',
        titleEn: 'Opening Session',
        startsAt: '2026-07-04T10:00:00.000Z',
        endsAt: '2026-07-04T11:00:00.000Z',
        deliveryMethod: 'ZOOM' as any,
        isPublished: true,
        sortOrder: 1,
      },
    });

    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        academyProgramId: 'program-1',
        isPublished: true,
        publishedAt: expect.any(Date),
        createdByUserId: 'user-1',
      }),
    );
    expect(result).toEqual({ item: { id: 'session-1', isPublished: true } });
  });
});

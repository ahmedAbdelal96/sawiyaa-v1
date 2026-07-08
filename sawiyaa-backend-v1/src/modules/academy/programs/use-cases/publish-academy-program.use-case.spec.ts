import { BadRequestException } from '@nestjs/common';
import { PublishAcademyProgramUseCase } from './publish-academy-program.use-case';

describe('PublishAcademyProgramUseCase', () => {
  it('rejects programs without a valid window', async () => {
    const repository = {
      findProgramById: jest.fn().mockResolvedValue({
        id: 'program-1',
        titleAr: 'Arabic title',
        titleEn: 'Academy Program',
        descriptionAr: 'Arabic description',
        descriptionEn: 'English description',
        priceEgp: { toString: () => '500.00' },
        priceUsd: { toString: () => '25.00' },
        startAt: new Date('2026-07-04T11:00:00.000Z'),
        endAt: new Date('2026-07-04T10:00:00.000Z'),
        status: 'DRAFT',
        publishedAt: null,
      }),
      updateProgram: jest.fn(),
    } as any;
    const presenter = { presentAdminProgramDetails: jest.fn() } as any;
    const useCase = new PublishAcademyProgramUseCase(repository, presenter);

    await expect(useCase.execute({ programId: 'program-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('publishes a valid program', async () => {
    const repository = {
      findProgramById: jest.fn().mockResolvedValue({
        id: 'program-1',
        titleAr: 'Arabic title',
        titleEn: 'Academy Program',
        descriptionAr: 'Arabic description',
        descriptionEn: 'English description',
        priceEgp: { toString: () => '500.00' },
        priceUsd: { toString: () => '25.00' },
        startAt: new Date('2026-07-04T09:00:00.000Z'),
        endAt: new Date('2026-07-04T10:00:00.000Z'),
        status: 'DRAFT',
        publishedAt: null,
      }),
      updateProgram: jest.fn().mockResolvedValue({
        id: 'program-1',
        status: 'PUBLISHED',
        publishedAt: new Date('2026-07-04T08:00:00.000Z'),
      }),
    } as any;
    const presenter = {
      presentAdminProgramDetails: jest.fn().mockReturnValue({
        id: 'program-1',
        status: 'PUBLISHED',
      }),
    } as any;
    const useCase = new PublishAcademyProgramUseCase(repository, presenter);

    const result = await useCase.execute({ programId: 'program-1' });

    expect(repository.updateProgram).toHaveBeenCalledWith(
      'program-1',
      expect.objectContaining({
        status: 'PUBLISHED',
        archivedAt: null,
      }),
    );
    expect(result).toEqual({ item: { id: 'program-1', status: 'PUBLISHED' } });
  });
});

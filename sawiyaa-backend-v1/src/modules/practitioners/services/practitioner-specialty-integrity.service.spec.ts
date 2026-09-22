import { PractitionerSpecialtyIntegrityService } from './practitioner-specialty-integrity.service';

describe('PractitionerSpecialtyIntegrityService', () => {
  it('rejects a child specialty that belongs to another primary specialty', async () => {
    const prisma = {
      specialtyCategory: {
        findFirst: jest.fn().mockResolvedValue({ id: 'parent-a' }),
      },
      specialty: {
        count: jest.fn().mockResolvedValue(0),
      },
    } as any;
    const service = new PractitionerSpecialtyIntegrityService(prisma);

    await expect(
      service.validateSelection({
        primarySpecialtyCategoryId: 'parent-a',
        specialtyIds: ['child-from-parent-b'],
      }),
    ).rejects.toMatchObject({
      response: {
        error: 'PRACTITIONER_INVALID_SPECIALTIES_FOR_CATEGORY',
      },
    });
  });

  it('allows a primary specialty with no child yet while a draft is being edited', async () => {
    const prisma = {
      specialtyCategory: {
        findFirst: jest.fn().mockResolvedValue({ id: 'parent-a' }),
      },
      specialty: {
        count: jest.fn().mockResolvedValue(0),
      },
    } as any;
    const service = new PractitionerSpecialtyIntegrityService(prisma);

    await expect(
      service.validateSelection({
        primarySpecialtyCategoryId: 'parent-a',
        specialtyIds: [],
      }),
    ).resolves.toBeUndefined();
  });
});

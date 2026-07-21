import { CountryRepository } from './country.repository';

describe('Practitioner CountryRepository', () => {
  const makeSut = () => {
    const prisma = {
      country: {
        findMany: jest.fn(),
      },
    } as any;

    const sut = new CountryRepository(prisma);
    return { sut, prisma };
  };

  it('reads active countries with canonical selector shape', async () => {
    const { sut, prisma } = makeSut();
    prisma.country.findMany.mockResolvedValue([
      {
        id: 'country-eg',
        isoCode: 'EG',
        name: 'Egypt',
        nativeName: 'Egypt',
      },
    ]);

    const rows = await sut.findAllActive();

    expect(prisma.country.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        isoCode: true,
        name: true,
        nativeName: true,
      },
      orderBy: { name: 'asc' },
    });
    expect(rows).toEqual([
      {
        id: 'country-eg',
        isoCode: 'EG',
        name: 'Egypt',
        nativeName: 'Egypt',
      },
    ]);
  });

  it('returns empty list when no active countries exist', async () => {
    const { sut, prisma } = makeSut();
    prisma.country.findMany.mockResolvedValue([]);

    await expect(sut.findAllActive()).resolves.toEqual([]);
  });
});

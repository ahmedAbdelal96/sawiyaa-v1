import { CountryRepository } from './country.repository';

describe('CountryRepository', () => {
  const makeSut = () => {
    const prisma = {
      country: {
        findMany: jest.fn(),
      },
    } as any;

    const sut = new CountryRepository(prisma);

    return { sut, prisma };
  };

  it('reads active countries from Country table with canonical shape ordering', async () => {
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

  it('returns an empty list when Country table has no active rows', async () => {
    const { sut, prisma } = makeSut();
    prisma.country.findMany.mockResolvedValue([]);

    await expect(sut.findAllActive()).resolves.toEqual([]);
  });

  it('propagates repository/database failures without fabricating data', async () => {
    const { sut, prisma } = makeSut();
    prisma.country.findMany.mockRejectedValue(new Error('db unavailable'));

    await expect(sut.findAllActive()).rejects.toThrow('db unavailable');
  });
});

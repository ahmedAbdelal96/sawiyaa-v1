import { PaymentRepository } from './payment.repository';

describe('PaymentRepository patient payment filters', () => {
  it('applies ownership, composed filters and matching count before pagination', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(17);
    const repository = new PaymentRepository({ payment: { findMany, count } } as any);

    const [items, total] = await repository.listPatientPayments({
      patientId: 'patient-a',
      search: 'therapist',
      currencyCode: 'USD',
      status: 'CAPTURED' as any,
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-01-31T23:59:59.999Z'),
      skip: 60,
      take: 20,
    });

    expect(items).toEqual([]);
    expect(total).toBe(17);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 60, take: 20 }));
    const where = findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      patientId: 'patient-a',
      currencyCode: 'USD',
      status: 'CAPTURED',
      createdAt: {
        gte: new Date('2026-01-01T00:00:00.000Z'),
        lte: new Date('2026-01-31T23:59:59.999Z'),
      },
    });
    expect(where.OR.length).toBeGreaterThan(1);
    expect(count).toHaveBeenCalledWith({ where });
  });
});

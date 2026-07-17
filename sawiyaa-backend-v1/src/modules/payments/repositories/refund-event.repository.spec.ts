import { Prisma } from '@prisma/client';
import { RefundEventRepository } from './refund-event.repository';

describe('RefundEventRepository', () => {
  it('exposes append and read-only query behavior', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'event-1' });
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new RefundEventRepository({
      refundEvent: { create, findMany },
    } as never);

    await repository.append({
      refundId: 'refund-1',
      paymentId: 'payment-1',
      eventType: 'REQUESTED',
      previousStatus: null,
      newStatus: 'REQUESTED',
      destination: 'CUSTOMER_WALLET',
      amount: new Prisma.Decimal('10.00'),
      currencyCode: 'EGP',
      actorType: 'USER',
      actorUserId: 'user-1',
      actorRolesJson: ['FINANCE_STAFF'],
      source: 'HTTP_REQUEST',
      reason: 'QA',
      requestId: 'request-1',
      correlationId: 'correlation-1',
    });
    await repository.listByRefundId('refund-1');

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.metadataJson).toBeUndefined();
    expect(findMany).toHaveBeenCalledWith({
      where: { refundId: 'refund-1' },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
    expect(Object.getOwnPropertyNames(RefundEventRepository.prototype)).toEqual(
      expect.arrayContaining(['append', 'listByRefundId']),
    );
    expect(Object.getOwnPropertyNames(RefundEventRepository.prototype)).not.toEqual(
      expect.arrayContaining(['update', 'updateMany', 'delete', 'deleteMany']),
    );
  });

  it('sanitizes sensitive metadata before append', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'event-1' });
    const repository = new RefundEventRepository({ refundEvent: { create } } as never);

    await repository.append({
      refundId: 'refund-1',
      paymentId: 'payment-1',
      eventType: 'REQUESTED',
      newStatus: 'REQUESTED',
      destination: 'CUSTOMER_WALLET',
      amount: new Prisma.Decimal('10.00'),
      currencyCode: 'EGP',
      metadataJson: { token: 'secret-value', safe: 'kept' },
    });

    expect(create.mock.calls[0][0].data.metadataJson).toEqual({
      token: '[REDACTED]',
      safe: 'kept',
    });
  });
});

import { Prisma } from '@prisma/client';
import { SecurityAuditRepository } from './security-audit.repository';

describe('SecurityAuditRepository', () => {
  it('uses the injected Prisma service for best-effort writes', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const prisma = { securityAuditLog: { create } } as never;
    const repository = new SecurityAuditRepository(prisma);

    await repository.create({
      action: 'test.action',
      outcome: 'SUCCESS' as never,
      actorType: 'SYSTEM' as never,
    } as Prisma.SecurityAuditLogUncheckedCreateInput);

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'test.action' }),
    });
  });

  it('uses the supplied transaction client for required writes', async () => {
    const serviceCreate = jest.fn();
    const tx = { securityAuditLog: { create: serviceCreate } } as Prisma.TransactionClient;
    const repository = new SecurityAuditRepository({} as never);

    await repository.create({
      action: 'test.transaction',
      outcome: 'SUCCESS' as never,
      actorType: 'SYSTEM' as never,
    } as Prisma.SecurityAuditLogUncheckedCreateInput, tx);

    expect(serviceCreate).toHaveBeenCalled();
  });
});

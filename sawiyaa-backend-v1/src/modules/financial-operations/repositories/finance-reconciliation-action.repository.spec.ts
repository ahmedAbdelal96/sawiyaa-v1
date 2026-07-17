import { FinanceReconciliationActionRepository } from './finance-reconciliation-action.repository';

describe('FinanceReconciliationActionRepository', () => {
  it('appends and reads the complete issue timeline without overwrite methods', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'action-1' });
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new FinanceReconciliationActionRepository({
      financeReconciliationAction: { create, findMany },
    } as never);

    await repository.append({
      issueId: 'issue-1',
      runId: 'run-1',
      actionType: 'ACKNOWLEDGED',
      previousStatus: 'OPEN',
      newStatus: 'ACKNOWLEDGED',
      actorType: 'USER',
      actorUserId: 'admin-1',
      actorRolesJson: ['FINANCE_STAFF'],
      source: 'HTTP_REQUEST',
      reason: 'Reviewed by finance',
      requestId: 'request-1',
      correlationId: 'correlation-1',
    });
    await repository.listByIssueId('issue-1');

    expect(create).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith({
      where: { issueId: 'issue-1' },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
    expect(Object.getOwnPropertyNames(FinanceReconciliationActionRepository.prototype)).not.toEqual(
      expect.arrayContaining(['update', 'updateMany', 'delete', 'deleteMany']),
    );
  });
});

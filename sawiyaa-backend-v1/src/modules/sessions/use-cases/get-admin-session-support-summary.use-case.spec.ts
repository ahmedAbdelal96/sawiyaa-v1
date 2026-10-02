import { GetAdminSessionSupportSummaryUseCase } from './get-admin-session-support-summary.use-case';

describe('GetAdminSessionSupportSummaryUseCase', () => {
  it('returns operational fields without clinical or private data', async () => {
    const prisma = {
      session: {
        findUnique: jest.fn().mockResolvedValue({
          id: 's1', sessionCode: 'SW-1', status: 'UPCOMING', durationMinutes: 50,
          scheduledStartAt: new Date('2026-09-23T10:00:00Z'), scheduledEndAt: new Date('2026-09-23T10:50:00Z'),
          sessionMode: 'VIDEO', patientId: 'patient-1',
          practitioner: { publicSlug: 'dr-a', user: { displayName: 'Dr A' } },
          payments: [{ status: 'CAPTURED' }], cancellationRecord: null,
        }),
      },
    };
    const useCase = new GetAdminSessionSupportSummaryUseCase(prisma as never);
    const result = await useCase.execute('s1');
    expect(result.item).toMatchObject({ id: 's1', status: 'UPCOMING', paymentStatus: 'CAPTURED' });
    expect(JSON.stringify(result)).not.toContain('notesInternal');
  });
});

import { PackagePurchasePresenter } from './package-purchase.presenter';

describe('PackagePurchasePresenter', () => {
  let presenter: PackagePurchasePresenter;

  beforeEach(() => {
    presenter = new PackagePurchasePresenter();
  });

  it('calculates canonical progress and remaining sessions correctly', () => {
    const mockPurchase: any = {
      id: 'purchase-1',
      status: 'ACTIVE',
      titleSnapshot: '6 Sessions Package',
      descriptionSnapshot: 'Great savings',
      planCodeSnapshot: 'SESSIONS_6',
      sessionCountSnapshot: 6,
      discountPercentSnapshot: '15.00',
      practitionerId: 'prac-1',
      practitioner: {
        id: 'prac-1',
        publicSlug: 'dr-ahmed',
        avatarUrl: 'https://example.com/avatar.jpg',
        professionalTitle: 'Psychiatrist',
        user: { displayName: 'Dr. Ahmed' },
      },
      sessionDurationMinutesSnapshot: 60,
      sessionModeSnapshot: 'VIDEO',
      selectedCurrencyCode: 'EGP',
      selectedBaseSessionPriceSnapshot: '500.00',
      undiscountedTotalSnapshot: '3000.00',
      discountAmountSnapshot: '450.00',
      patientPayableTotalSnapshot: '2550.00',
      paymentExpiresAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      sessions: [
        {
          id: 's1',
          sessionCode: 'SES-1',
          status: 'COMPLETED',
          provider: 'DAILY',
          providerRoomId: null,
          providerSessionRef: null,
          scheduledStartAt: new Date('2026-01-02'),
          scheduledEndAt: new Date('2026-01-02'),
          durationMinutes: 60,
          sessionMode: 'VIDEO',
          packageSessionIndex: 1,
        },
        {
          id: 's2',
          sessionCode: 'SES-2',
          status: 'COMPLETED',
          provider: 'DAILY',
          providerRoomId: null,
          providerSessionRef: null,
          scheduledStartAt: new Date('2026-01-03'),
          scheduledEndAt: new Date('2026-01-03'),
          durationMinutes: 60,
          sessionMode: 'VIDEO',
          packageSessionIndex: 2,
        },
        {
          id: 's3',
          sessionCode: 'SES-3',
          status: 'UPCOMING',
          provider: 'DAILY',
          providerRoomId: null,
          providerSessionRef: null,
          scheduledStartAt: new Date('2026-01-10'),
          scheduledEndAt: new Date('2026-01-10'),
          durationMinutes: 60,
          sessionMode: 'VIDEO',
          packageSessionIndex: 3,
        },
      ],
    };

    const vm = presenter.toViewModel({ purchase: mockPurchase });

    expect(vm.title).toBe('6 Sessions Package');
    expect(vm.practitioner?.displayName).toBe('Dr. Ahmed');
    expect(vm.progress.totalSessions).toBe(6);
    expect(vm.progress.completedSessions).toBe(2);
    expect(vm.progress.remainingSessions).toBe(4);
    expect(vm.progress.scheduledSessions).toBe(1);
    expect(vm.progress.progressPercent).toBe(33);
  });

  it('clamps remaining sessions to 0 when completed count reaches or exceeds total', () => {
    const mockPurchase: any = {
      id: 'purchase-2',
      status: 'COMPLETED',
      titleSnapshot: '4 Sessions Package',
      planCodeSnapshot: 'SESSIONS_4',
      sessionCountSnapshot: 4,
      discountPercentSnapshot: '10.00',
      practitionerId: 'prac-1',
      sessionDurationMinutesSnapshot: 60,
      sessionModeSnapshot: 'VIDEO',
      selectedCurrencyCode: 'USD',
      selectedBaseSessionPriceSnapshot: '100.00',
      undiscountedTotalSnapshot: '400.00',
      discountAmountSnapshot: '40.00',
      patientPayableTotalSnapshot: '360.00',
      paymentExpiresAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      sessions: Array(5).fill(null).map((_, i) => ({
        id: `s-${i}`,
        sessionCode: `SES-${i}`,
        status: 'COMPLETED',
        provider: 'DAILY',
        providerRoomId: null,
        providerSessionRef: null,
        scheduledStartAt: new Date(),
        scheduledEndAt: new Date(),
        durationMinutes: 60,
        sessionMode: 'VIDEO',
        packageSessionIndex: i + 1,
      })),
    };

    const vm = presenter.toViewModel({ purchase: mockPurchase });

    expect(vm.progress.totalSessions).toBe(4);
    expect(vm.progress.completedSessions).toBe(4);
    expect(vm.progress.remainingSessions).toBe(0);
    expect(vm.progress.progressPercent).toBe(100);
  });
});

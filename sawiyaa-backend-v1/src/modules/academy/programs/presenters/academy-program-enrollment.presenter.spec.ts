import { AcademyProgramEnrollmentPresenter } from './academy-program-enrollment.presenter';

describe('AcademyProgramEnrollmentPresenter', () => {
  it('does not resolve a payment gateway for a deferred enrollment response', () => {
    const resolveRoute = jest.fn(() => {
      throw new Error('PAYMENT_PROVIDER_UNAVAILABLE');
    });
    const presenter = new AcademyProgramEnrollmentPresenter(
      {
        presentPublicProgramItem: jest
          .fn()
          .mockReturnValue({ id: 'program-1' }),
      } as never,
      { resolveRoute } as never,
    );

    const result = presenter.presentEnrollmentItem(
      {
        id: 'enrollment-1',
        publicAccessToken: 'token-1',
        userId: null,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'CREATED',
        registeredAt: new Date('2026-01-01T00:00:00.000Z'),
        lockedAt: null,
        seatReservedAt: new Date('2026-01-01T00:00:00.000Z'),
        seatReservationExpiresAt: new Date('2026-01-01T00:15:00.000Z'),
        confirmedAt: null,
        cancelledAt: null,
        expiredAt: null,
        completedAt: null,
        certificateIssuedAt: null,
        certificateFileStoragePath: null,
        certificateFileName: null,
        certificateUploadedAt: null,
        certificateUploadedByUserId: null,
        selectedCurrencyCode: 'EGP',
        selectedAmountSnapshot: { toString: () => '150' },
        submittedCountry: null,
        lockedCountry: null,
        lockedCountrySource: 'SYSTEM',
        contactFullName: 'Learner',
        contactEmail: 'learner@example.com',
        contactPhone: '01000000000',
        contactWhatsapp: null,
        contactCountry: null,
        contactNotes: null,
        academyProgram: { _count: { sessions: 0 } },
        academyLearner: { countryCode: null },
        payment: null,
        paymentAttempts: [],
      } as never,
      'en',
      { resolveGatewayAvailability: false },
    );

    expect(resolveRoute).not.toHaveBeenCalled();
    expect(result.gatewayAvailable).toBe(false);
    expect(result.payment).toBeNull();
  });

  it('projects a paid enrollment with an unpaid status as pending in the admin view', () => {
    const presenter = new AcademyProgramEnrollmentPresenter(
      { presentPublicProgramItem: jest.fn().mockReturnValue({ id: 'program-1' }) } as never,
    );

    const result = presenter.presentAdminEnrollmentListItem(
      {
        id: 'enrollment-legacy',
        publicAccessToken: 'token-legacy',
        userId: null,
        status: 'CONFIRMED',
        paymentStatus: 'CREATED',
        registeredAt: new Date('2026-01-01T00:00:00.000Z'),
        lockedAt: new Date('2026-01-01T00:00:00.000Z'),
        seatReservedAt: new Date('2026-01-01T00:00:00.000Z'),
        seatReservationExpiresAt: null,
        confirmedAt: new Date('2026-01-01T00:00:00.000Z'),
        cancelledAt: null,
        expiredAt: null,
        completedAt: null,
        certificateIssuedAt: null,
        certificateFileStoragePath: null,
        certificateFileName: null,
        certificateUploadedAt: null,
        certificateUploadedByUserId: null,
        selectedCurrencyCode: 'EGP',
        selectedAmountSnapshot: { toString: () => '150' },
        submittedCountry: 'EG',
        lockedCountry: 'EG',
        lockedCountrySource: 'SYSTEM',
        contactFullName: 'Legacy Learner',
        contactEmail: 'legacy@example.com',
        contactPhone: '01000000000',
        contactWhatsapp: null,
        contactCountry: 'EG',
        contactNotes: null,
        academyProgram: { _count: { sessions: 0 } },
        academyLearner: {
          id: 'learner-legacy',
          userId: null,
          fullName: 'Legacy Learner',
          phoneNumber: '01000000000',
          whatsappNumber: null,
          email: 'legacy@example.com',
          countryCode: 'EG',
          countryCodeDeclared: 'EG',
          countryCodeSource: 'SYSTEM',
          countryCodeMismatch: false,
          sourceLabel: 'public',
          city: null,
          jobTitle: null,
          employer: null,
          education: null,
          notes: null,
        },
        payment: null,
        paymentAttempts: [],
        user: null,
      } as never,
      'en',
    );

    expect(result.status).toBe('PENDING_PAYMENT');
    expect(result.paymentStatus).toBe('CREATED');
    expect(result.confirmedAt).toBeNull();
  });
});

import { AcademyPresenter } from './academy.presenter';

describe('AcademyPresenter', () => {
  const presenter = new AcademyPresenter();

  const baseInput = {
    id: 'enrollment_1',
    publicAccessToken: 'token_1',
    paymentStatus: 'PENDING',
    registeredAt: new Date('2026-06-08T10:00:00.000Z'),
    confirmedAt: null,
    cancelledAt: null,
    failedAt: null,
    failedReason: null,
    notesInternal: null,
    academyCourse: {
      id: 'course_1',
      slug: 'anxiety-foundations-101',
      title: 'Anxiety Foundations 101',
      meetingUrl: 'https://meet.example.com/academy/anxiety-101',
      whatsappGroupUrl: 'https://chat.whatsapp.com/example-group',
    },
    academyLearner: {
      fullName: 'Learner One',
      phoneNumber: '+201111111111',
      whatsappNumber: '+201111111111',
      email: 'learner.one@example.com',
      countryCode: 'EG',
      countryCodeDeclared: null,
      countryCodeSource: 'PHONE',
      countryCodeMismatch: false,
      sourceLabel: 'mobile-academy',
    },
    paymentAttempts: [],
    payment: null,
  };

  it('does not expose join access while payment is pending', () => {
    const item = presenter.presentEnrollmentItem({
      ...baseInput,
      enrollmentStatus: 'PENDING_PAYMENT',
    });

    expect(item.joinAccess).toEqual({
      canAccessSession: false,
      canAccessGroup: false,
      accessLockedReason: 'PAYMENT_PENDING',
      meetingUrl: null,
      whatsappGroupUrl: null,
    });
  });

  it('exposes join access for confirmed enrollments when links are available', () => {
    const item = presenter.presentEnrollmentItem({
      ...baseInput,
      enrollmentStatus: 'CONFIRMED',
    });

    expect(item.joinAccess).toEqual({
      canAccessSession: true,
      canAccessGroup: true,
      accessLockedReason: null,
      meetingUrl: 'https://meet.example.com/academy/anxiety-101',
      whatsappGroupUrl: 'https://chat.whatsapp.com/example-group',
    });
  });
});

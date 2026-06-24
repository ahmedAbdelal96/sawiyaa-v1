import {
  buildParticipantIdentity,
  buildParticipantsSummary,
} from './session-participant-identity.util';

describe('buildParticipantIdentity', () => {
  it('returns nulls when the patient profile is missing', () => {
    const result = buildParticipantIdentity('patient', {
      patient: null,
      practitioner: null,
    });
    expect(result).toEqual({
      userId: null,
      displayName: null,
      email: null,
      phone: null,
    });
  });

  it('picks the primary email and primary phone when present', () => {
    const session = {
      patient: {
        id: 'patient_profile_1',
        user: {
          id: 'user_patient_1',
          displayName: 'Layla Hassan',
          emails: [
            { email: 'layla-old@example.com', isPrimary: false },
            { email: 'layla@example.com', isPrimary: true },
          ],
          phones: [
            { phone: '+97000000000', isPrimary: false },
            { phone: '+970111111111', isPrimary: true },
          ],
        },
      },
      practitioner: {
        id: 'pract_profile_1',
        user: {
          id: 'user_pract_1',
          displayName: 'Dr. Karim',
          emails: [{ email: 'karim@example.com', isPrimary: true }],
          phones: [{ phone: '+970222222222', isPrimary: true }],
        },
      },
    };

    expect(buildParticipantIdentity('patient', session)).toEqual({
      userId: 'user_patient_1',
      displayName: 'Layla Hassan',
      email: 'layla@example.com',
      phone: '+970111111111',
    });
    expect(buildParticipantIdentity('practitioner', session)).toEqual({
      userId: 'user_pract_1',
      displayName: 'Dr. Karim',
      email: 'karim@example.com',
      phone: '+970222222222',
    });
  });

  it('falls back to the first email/phone when none is marked primary', () => {
    const session = {
      patient: {
        id: 'p',
        user: {
          id: 'u',
          displayName: 'Layla',
          emails: [{ email: 'only@example.com', isPrimary: false }],
          phones: [{ phone: '+9700', isPrimary: false }],
        },
      },
      practitioner: null,
    };
    expect(buildParticipantIdentity('patient', session)).toEqual({
      userId: 'u',
      displayName: 'Layla',
      email: 'only@example.com',
      phone: '+9700',
    });
  });

  it('returns null email/phone when no contact rows are present', () => {
    const session = {
      patient: {
        id: 'p',
        user: {
          id: 'u',
          displayName: 'No Contact',
          emails: [],
          phones: [],
        },
      },
      practitioner: null,
    };
    expect(buildParticipantIdentity('patient', session).email).toBeNull();
    expect(buildParticipantIdentity('patient', session).phone).toBeNull();
  });

  it('buildParticipantsSummary composes both sides in one call', () => {
    const session = {
      patient: {
        id: 'p',
        user: {
          id: 'u1',
          displayName: 'Layla',
          emails: [],
          phones: [],
        },
      },
      practitioner: {
        id: 'pr',
        user: {
          id: 'u2',
          displayName: 'Karim',
          emails: [],
          phones: [],
        },
      },
    };
    const out = buildParticipantsSummary(session);
    expect(out.patient.displayName).toBe('Layla');
    expect(out.practitioner.displayName).toBe('Karim');
  });
});

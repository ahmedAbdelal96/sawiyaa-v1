import { resolvePatientDisplayName } from './resolve-patient-display-name.util';

describe('resolvePatientDisplayName', () => {
  it('prefers the patient profile name', () => {
    expect(
      resolvePatientDisplayName(
        { displayName: 'Ahmed A.' },
        { displayName: 'Ahmed Mohamed' },
        'Patient',
      ),
    ).toBe('Ahmed A.');
  });

  it('falls back to the legacy user name', () => {
    expect(
      resolvePatientDisplayName(
        { displayName: null },
        { displayName: 'Ahmed Mohamed' },
        'Patient',
      ),
    ).toBe('Ahmed Mohamed');
  });

  it('uses the safe fallback when both names are empty', () => {
    expect(resolvePatientDisplayName(null, null, 'Patient')).toBe('Patient');
  });
});

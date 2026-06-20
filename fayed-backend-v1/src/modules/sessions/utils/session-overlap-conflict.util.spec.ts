import { ConflictException } from '@nestjs/common';
import {
  getSessionOverlapConflictScope,
  toSessionOverlapConflictException,
} from './session-overlap-conflict.util';

describe('session-overlap-conflict.util', () => {
  it('detects practitioner overlap violations from the SQLSTATE and constraint name', () => {
    const scope = getSessionOverlapConflictScope({
      code: '23P01',
      message:
        'conflicting key value violates exclusion constraint "Session_practitioner_time_no_overlap_excl"',
      meta: {
        constraint: 'Session_practitioner_time_no_overlap_excl',
      },
    });

    expect(scope).toBe('practitioner');

    const exception = toSessionOverlapConflictException({
      code: '23P01',
      message:
        'conflicting key value violates exclusion constraint "Session_practitioner_time_no_overlap_excl"',
      meta: {
        constraint: 'Session_practitioner_time_no_overlap_excl',
      },
    });

    expect(exception).toBeInstanceOf(ConflictException);
    expect(JSON.stringify(exception?.getResponse())).not.toContain('23P01');
    expect(JSON.stringify(exception?.getResponse())).not.toContain(
      'Session_practitioner_time_no_overlap_excl',
    );
  });

  it('detects patient overlap violations from the SQLSTATE and constraint name', () => {
    const scope = getSessionOverlapConflictScope({
      code: '23P01',
      message:
        'conflicting key value violates exclusion constraint "Session_patient_time_no_overlap_excl"',
      meta: {
        constraint: 'Session_patient_time_no_overlap_excl',
      },
    });

    expect(scope).toBe('patient');
  });

  it('ignores unrelated errors', () => {
    expect(getSessionOverlapConflictScope({ code: 'P2002' })).toBeNull();
    expect(toSessionOverlapConflictException({ code: 'P2002' })).toBeNull();
  });
});

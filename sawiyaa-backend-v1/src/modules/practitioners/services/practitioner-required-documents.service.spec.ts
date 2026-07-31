import { PractitionerRequiredDocumentsService } from './practitioner-required-documents.service';

describe('PractitionerRequiredDocumentsService', () => {
  const service = new PractitionerRequiredDocumentsService();
  const record = (credentialType: string, extra: Record<string, unknown> = {}) => ({
    credentialType,
    reviewStatus: 'PENDING',
    fileUrl: `/uploads/${credentialType}.pdf`,
    expiresAt: null,
    ...extra,
  });

  it.each([
    [['PASSPORT']],
    [['NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK']],
    [['PASSPORT', 'NATIONAL_ID_FRONT']],
  ])('accepts a valid identity option: %j', (types) => {
    const result = service.evaluate([
      ...types.map((type) => record(type)),
      record('DEGREE'),
      record('LICENSE'),
    ]);
    expect(result.groups.identity.complete).toBe(true);
  });

  it.each([
    [['NATIONAL_ID_FRONT']],
    [['NATIONAL_ID_BACK']],
    [[]],
    [['NATIONAL_ID']],
  ])('rejects incomplete or ambiguous identity: %j', (types) => {
    const result = service.evaluate([
      ...types.map((type) => record(type)),
      record('DEGREE'),
      record('LICENSE'),
    ]);
    expect(result.groups.identity.complete).toBe(false);
  });

  it('requires academic and professional groups while allowing either professional option', () => {
    expect(service.evaluate([record('PASSPORT'), record('DEGREE'), record('MEMBERSHIP')]).complete).toBe(true);
    expect(service.evaluate([record('PASSPORT'), record('DEGREE'), record('LICENSE')]).complete).toBe(true);
    expect(service.evaluate([record('PASSPORT'), record('MEMBERSHIP')]).missingRequirements).toContain('ACADEMIC_CERTIFICATE');
    expect(service.evaluate([record('PASSPORT'), record('DEGREE')]).missingRequirements).toContain('PROFESSIONAL_AUTHORIZATION');
    expect(service.evaluate([record('PASSPORT'), record('DEGREE'), record('MEMBERSHIP'), record('LICENSE')]).complete).toBe(true);
  });

  it.each(['FAILED', 'DELETED', 'UPLOADING', 'REJECTED', 'EXPIRED'])('does not count unsafe status %s', (reviewStatus) => {
    const result = service.evaluate([
      record('PASSPORT', { reviewStatus }),
      record('DEGREE'),
      record('LICENSE'),
    ]);
    expect(result.complete).toBe(false);
  });
});

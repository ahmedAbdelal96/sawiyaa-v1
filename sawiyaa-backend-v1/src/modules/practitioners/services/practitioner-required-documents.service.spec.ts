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
    [['NATIONAL_ID_FRONT', 'NATIONAL_ID_BACK']],
  ])('accepts the canonical national identity pair: %j', (types) => {
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
    expect(service.evaluate([record('NATIONAL_ID_FRONT'), record('NATIONAL_ID_BACK'), record('DEGREE'), record('MEMBERSHIP')]).complete).toBe(true);
    expect(service.evaluate([record('NATIONAL_ID_FRONT'), record('NATIONAL_ID_BACK'), record('DEGREE'), record('LICENSE')]).complete).toBe(true);
    expect(service.evaluate([record('NATIONAL_ID_FRONT'), record('NATIONAL_ID_BACK'), record('MEMBERSHIP')]).missingRequirements).toContain('ACADEMIC_CERTIFICATE');
    expect(service.evaluate([record('NATIONAL_ID_FRONT'), record('NATIONAL_ID_BACK'), record('DEGREE')]).missingRequirements).toContain('PROFESSIONAL_AUTHORIZATION');
    expect(service.evaluate([record('NATIONAL_ID_FRONT'), record('NATIONAL_ID_BACK'), record('DEGREE'), record('MEMBERSHIP'), record('LICENSE')]).complete).toBe(true);
  });

  it('never treats a passport as the required identity evidence', () => {
    expect(service.evaluate([record('PASSPORT'), record('DEGREE'), record('LICENSE')]).complete).toBe(false);
    expect(service.evaluate([record('PASSPORT'), record('DEGREE'), record('LICENSE')]).missingRequirements).toContain('IDENTITY_PROOF');
  });

  it('uses country configuration instead of globally requiring front/back', () => {
    const result = service.evaluate(
      [record('NATIONAL_ID'), record('DEGREE'), record('LICENSE')],
      { countryCode: 'US' },
    );
    expect(result.groups.identity.complete).toBe(true);
    expect(result.groups.identity.policy.requireBackImage).toBe(false);
    expect(result.groups.identity.policy.acceptedCredentialTypes).toEqual(['NATIONAL_ID']);
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

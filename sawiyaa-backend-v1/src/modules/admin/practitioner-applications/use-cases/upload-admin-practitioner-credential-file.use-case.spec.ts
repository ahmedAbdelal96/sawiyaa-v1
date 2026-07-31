import { UploadAdminPractitionerCredentialFileUseCase } from './upload-admin-practitioner-credential-file.use-case';

describe('UploadAdminPractitionerCredentialFileUseCase', () => {
  it('returns an opaque credential id and safe metadata, never fileUrl', async () => {
    const useCase = new UploadAdminPractitionerCredentialFileUseCase(
      { t: jest.fn().mockReturnValue('uploaded') } as any,
      {
        isAllowedMimeType: jest.fn().mockReturnValue(true),
        saveCredentialFile: jest.fn().mockResolvedValue({
          fileUrl: '/uploads/practitioners/admin-direct-create/credentials/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf',
          sizeBytes: 128,
        }),
      } as any,
    );

    const result = await useCase.execute({
      locale: 'en',
      credentialType: 'DEGREE' as any,
      file: { buffer: Buffer.from('pdf'), mimetype: 'application/pdf', size: 3 },
    });

    expect(result.credential).toEqual(expect.objectContaining({
      credentialId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      credentialType: 'DEGREE',
      mimeType: 'application/pdf',
      sizeBytes: 128,
    }));
    expect(result.credential).not.toHaveProperty('fileUrl');
  });
});

import { NotFoundException } from '@nestjs/common';
import { GetPractitionerApplicationCredentialFileUseCase } from './get-practitioner-application-credential-file.use-case';

describe('GetPractitionerApplicationCredentialFileUseCase', () => {
  const applicationRepository = { findById: jest.fn() };
  const credentialRepository = { findById: jest.fn() };
  const credentialStorage = {
    resolveAbsolutePathFromFileUrl: jest.fn(),
    statSafeFile: jest.fn(),
    guessMimeTypeFromAbsolutePath: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    applicationRepository.findById.mockResolvedValue({ practitionerId: 'profile-1' });
    credentialRepository.findById.mockResolvedValue({
      practitionerId: 'profile-1',
      fileUrl: '/uploads/practitioners/profile-1/credentials/file.pdf',
    });
    credentialStorage.resolveAbsolutePathFromFileUrl.mockReturnValue('C:/uploads/file.pdf');
    credentialStorage.statSafeFile.mockResolvedValue({ isFile: () => true });
    credentialStorage.guessMimeTypeFromAbsolutePath.mockReturnValue('application/pdf');
  });

  it('returns only a validated private path and detected MIME type', async () => {
    const useCase = new GetPractitionerApplicationCredentialFileUseCase(
      applicationRepository as any,
      credentialRepository as any,
      credentialStorage as any,
    );

    await expect(useCase.execute({ applicationId: 'app-1', credentialId: 'credential-1' })).resolves.toEqual({
      absolutePath: 'C:/uploads/file.pdf',
      mimeType: 'application/pdf',
    });
  });

  it('rejects invalid, missing, and cross-application files', async () => {
    const useCase = new GetPractitionerApplicationCredentialFileUseCase(
      applicationRepository as any,
      credentialRepository as any,
      credentialStorage as any,
    );

    credentialStorage.resolveAbsolutePathFromFileUrl.mockReturnValueOnce(null);
    await expect(useCase.execute({ applicationId: 'app-1', credentialId: 'credential-1' })).rejects.toThrow(NotFoundException);

    credentialStorage.resolveAbsolutePathFromFileUrl.mockReturnValueOnce('C:/uploads/missing.pdf');
    credentialStorage.statSafeFile.mockResolvedValueOnce(null);
    await expect(useCase.execute({ applicationId: 'app-1', credentialId: 'credential-1' })).rejects.toThrow(NotFoundException);

    credentialRepository.findById.mockResolvedValueOnce({
      practitionerId: 'different-profile',
      fileUrl: '/uploads/practitioners/other/credentials/file.pdf',
    });
    await expect(useCase.execute({ applicationId: 'app-1', credentialId: 'credential-1' })).rejects.toThrow(NotFoundException);
  });
});

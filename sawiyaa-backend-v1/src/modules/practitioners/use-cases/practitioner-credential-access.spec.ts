import { ConflictException, NotFoundException } from '@nestjs/common';
import { PractitionerApplicationStatus, PractitionerStatus } from '@prisma/client';
import { promises as fs } from 'fs';
import { DeletePractitionerCredentialUseCase } from './delete-practitioner-credential.use-case';
import { GetPractitionerCredentialFileUseCase } from './get-practitioner-credential-file.use-case';

describe('practitioner credential access', () => {
  const profile = { id: 'profile-1', status: PractitionerStatus.DRAFT };
  const credential = {
    id: 'credential-1',
    practitionerId: profile.id,
    fileUrl: '/uploads/practitioners/profile-1/credentials/file.pdf',
  };

  const profileRepository = { findByUserId: jest.fn() };
  const applicationRepository = { findLatestByPractitionerId: jest.fn() };
  const credentialRepository = {
    findByIdForPractitioner: jest.fn(),
    deleteById: jest.fn(),
  };
  const storageService = {
    resolveAbsolutePathFromFileUrl: jest.fn().mockReturnValue('C:/private/file.pdf'),
    guessMimeTypeFromAbsolutePath: jest.fn().mockReturnValue('application/pdf'),
    deleteCredential: jest.fn(),
  };
  const i18nService = { t: jest.fn().mockReturnValue('ok') };

  beforeEach(() => {
    jest.clearAllMocks();
    profileRepository.findByUserId.mockResolvedValue(profile);
    applicationRepository.findLatestByPractitionerId.mockResolvedValue({ status: PractitionerApplicationStatus.DRAFT });
    credentialRepository.findByIdForPractitioner.mockResolvedValue(credential);
  });

  it('allows the owner to view an existing file without returning storage details', async () => {
    jest.spyOn(fs, 'stat').mockResolvedValue({ isFile: () => true } as any);
    const useCase = new GetPractitionerCredentialFileUseCase(profileRepository as any, credentialRepository as any, storageService as any);

    const result = await useCase.execute({ userId: 'user-1', credentialId: credential.id });

    expect(result).toEqual({ absolutePath: 'C:/private/file.pdf', mimeType: 'application/pdf' });
    expect(JSON.stringify(result)).not.toContain('/uploads/');
  });

  it('rejects another practitioner and missing or deleted files safely', async () => {
    const useCase = new GetPractitionerCredentialFileUseCase(profileRepository as any, credentialRepository as any, storageService as any);
    credentialRepository.findByIdForPractitioner.mockResolvedValueOnce(null);
    await expect(useCase.execute({ userId: 'user-2', credentialId: credential.id })).rejects.toThrow(NotFoundException);

    credentialRepository.findByIdForPractitioner.mockResolvedValueOnce(credential);
    jest.spyOn(fs, 'stat').mockResolvedValueOnce(null as any);
    await expect(useCase.execute({ userId: 'user-1', credentialId: credential.id })).rejects.toThrow(NotFoundException);
  });

  it.each([
    PractitionerApplicationStatus.SUBMITTED,
    PractitionerApplicationStatus.UNDER_REVIEW,
    PractitionerApplicationStatus.APPROVED,
    PractitionerApplicationStatus.ARCHIVED,
  ])('rejects deletion while application is %s', async (status) => {
    applicationRepository.findLatestByPractitionerId.mockResolvedValue({ status });
    const useCase = new DeletePractitionerCredentialUseCase(i18nService as any, profileRepository as any, applicationRepository as any, credentialRepository as any, storageService as any);

    await expect(useCase.execute({ userId: 'user-1', credentialId: credential.id, locale: 'en' })).rejects.toThrow(ConflictException);
    expect(credentialRepository.deleteById).not.toHaveBeenCalled();
  });

  it('allows deletion in a rejected revision and removes the stored file', async () => {
    profileRepository.findByUserId.mockResolvedValue({ ...profile, status: PractitionerStatus.REJECTED });
    applicationRepository.findLatestByPractitionerId.mockResolvedValue({ status: PractitionerApplicationStatus.CHANGES_REQUESTED });
    const useCase = new DeletePractitionerCredentialUseCase(i18nService as any, profileRepository as any, applicationRepository as any, credentialRepository as any, storageService as any);

    await useCase.execute({ userId: 'user-1', credentialId: credential.id, locale: 'ar' });

    expect(credentialRepository.deleteById).toHaveBeenCalledWith(credential.id);
    expect(storageService.deleteCredential).toHaveBeenCalledWith(credential.fileUrl);
  });
});

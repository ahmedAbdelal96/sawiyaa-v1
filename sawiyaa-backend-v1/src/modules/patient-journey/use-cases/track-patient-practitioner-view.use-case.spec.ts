import { NotFoundException } from '@nestjs/common';
import { PatientJourneyPatientRepository } from '../repositories/patient-journey-patient.repository';
import { PatientHomeRepository } from '../repositories/patient-home.repository';
import { TrackPatientPractitionerViewUseCase } from './track-patient-practitioner-view.use-case';

describe('TrackPatientPractitionerViewUseCase', () => {
  const patientRepository = {
    findByUserId: jest.fn(),
  } as unknown as PatientJourneyPatientRepository;

  const patientHomeRepository = {
    findPublicPractitionerBySlug: jest.fn(),
    trackView: jest.fn(),
  } as unknown as PatientHomeRepository;

  const useCase = new TrackPatientPractitionerViewUseCase(
    patientRepository,
    patientHomeRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates tracking for first valid view', async () => {
    (patientRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (patientHomeRepository.findPublicPractitionerBySlug as jest.Mock).mockResolvedValue(
      {
        id: 'practitioner-1',
        publicSlug: 'dr-hassan',
      },
    );

    const result = await useCase.execute({
      userId: 'user-1',
      slug: 'dr-hassan',
      locale: 'ar',
    });

    expect(patientHomeRepository.trackView).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-1',
        practitionerId: 'practitioner-1',
        antiNoiseWindowMinutes: 10,
      }),
    );
    expect(result.slug).toBe('dr-hassan');
    expect(result.trackedAt).toEqual(expect.any(String));
  });

  it('throws not found for unknown practitioner slug', async () => {
    (patientRepository.findByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (patientHomeRepository.findPublicPractitionerBySlug as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        slug: 'unknown',
        locale: 'ar',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

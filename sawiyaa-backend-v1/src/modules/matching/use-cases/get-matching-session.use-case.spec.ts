import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetMatchingSessionUseCase } from './get-matching-session.use-case';
import { MatchingSessionAccessPolicy } from '../policies/matching-session-access.policy';
import { MatchingPatientRepository } from '../repositories/matching-patient.repository';
import { MatchingSessionRepository } from '../repositories/matching-session.repository';
import { MatchingPresenter } from '../presenters/matching.presenter';

describe('GetMatchingSessionUseCase', () => {
  const matchingPatientRepository = {
    findByUserId: jest.fn(),
  } as unknown as MatchingPatientRepository;
  const matchingSessionRepository = {
    findOwnedCompletedSession: jest.fn(),
  } as unknown as MatchingSessionRepository;
  const matchingSessionAccessPolicy = {
    assertOwnership: jest.fn(),
  } as unknown as MatchingSessionAccessPolicy;
  const matchingPresenter = {
    presentSession: jest.fn(),
  } as unknown as MatchingPresenter;

  const useCase = new GetMatchingSessionUseCase(
    matchingPatientRepository,
    matchingSessionRepository,
    matchingSessionAccessPolicy,
    matchingPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns owned session details', async () => {
    matchingPatientRepository.findByUserId = jest.fn().mockResolvedValue({
      id: 'patient-1',
    });
    matchingSessionRepository.findOwnedCompletedSession = jest
      .fn()
      .mockResolvedValue({
        id: 'session-1',
        patientProfileId: 'patient-1',
        answers: [],
        recommendations: [],
      });
    matchingPresenter.presentSession = jest.fn().mockReturnValue({
      sessionId: 'session-1',
      answers: {},
      items: [],
    });

    const result = await useCase.execute({
      userId: 'user-1',
      sessionId: 'session-1',
    });

    expect(result.sessionId).toBe('session-1');
  });

  it('throws when session does not exist', async () => {
    matchingPatientRepository.findByUserId = jest.fn().mockResolvedValue({
      id: 'patient-1',
    });
    matchingSessionRepository.findOwnedCompletedSession = jest
      .fn()
      .mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'user-1',
        sessionId: 'session-x',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('propagates ownership policy failure', async () => {
    matchingPatientRepository.findByUserId = jest.fn().mockResolvedValue({
      id: 'patient-1',
    });
    matchingSessionRepository.findOwnedCompletedSession = jest
      .fn()
      .mockResolvedValue({
        id: 'session-1',
        patientProfileId: 'patient-2',
        answers: [],
        recommendations: [],
      });
    matchingSessionAccessPolicy.assertOwnership = jest.fn(() => {
      throw new ForbiddenException();
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

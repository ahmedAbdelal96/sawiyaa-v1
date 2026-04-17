import { ConflictException } from '@nestjs/common';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatActorRepository } from '../repositories/care-chat-actor.repository';
import { CareChatLinkedSessionRepository } from '../repositories/care-chat-linked-session.repository';
import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';
import { CreateCareChatRequestUseCase } from './create-care-chat-request.use-case';

describe('CreateCareChatRequestUseCase', () => {
  const actorRepository = {
    findPatientProfileByUserId: jest.fn(),
    findEligiblePractitionerBySlug: jest.fn(),
  } as unknown as CareChatActorRepository;

  const linkedSessionRepository = {
    findOwnedPatientSession: jest.fn(),
  } as unknown as CareChatLinkedSessionRepository;

  const requestRepository = {
    findExistingActiveBetweenActors: jest.fn(),
    createRequest: jest.fn(),
  } as unknown as CareChatRequestRepository;

  const presenter = {
    presentUserRequestItem: jest.fn(),
  } as unknown as CareChatPresenter;

  const useCase = new CreateCareChatRequestUseCase(
    actorRepository,
    linkedSessionRepository,
    requestRepository,
    presenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prevents duplicate active requests for the same patient/practitioner pair', async () => {
    (actorRepository.findPatientProfileByUserId as jest.Mock).mockResolvedValue({
      id: 'patient-1',
    });
    (actorRepository.findEligiblePractitionerBySlug as jest.Mock).mockResolvedValue({
      id: 'practitioner-1',
    });
    (requestRepository.findExistingActiveBetweenActors as jest.Mock).mockResolvedValue(
      {
        id: 'request-1',
        status: 'PENDING',
      },
    );

    await expect(
      useCase.execute({
        userId: 'user-1',
        payload: { practitionerSlug: 'dr-1' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

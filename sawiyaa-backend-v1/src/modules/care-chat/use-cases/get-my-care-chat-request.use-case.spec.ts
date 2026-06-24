import { NotFoundException } from '@nestjs/common';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatActorRepository } from '../repositories/care-chat-actor.repository';
import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';
import { GetMyCareChatRequestUseCase } from './get-my-care-chat-request.use-case';

describe('GetMyCareChatRequestUseCase', () => {
  const actorRepository = {
    findPractitionerProfileByUserId: jest.fn(),
  } as unknown as CareChatActorRepository;

  const requestRepository = {
    findByIdForActor: jest.fn(),
  } as unknown as CareChatRequestRepository;

  const presenter = {
    presentUserRequestItem: jest.fn(),
  } as unknown as CareChatPresenter;

  const useCase = new GetMyCareChatRequestUseCase(
    actorRepository,
    requestRepository,
    presenter,
  );

  it('enforces practitioner ownership when reading request details', async () => {
    (
      actorRepository.findPractitionerProfileByUserId as jest.Mock
    ).mockResolvedValue({
      id: 'practitioner-1',
    });
    (requestRepository.findByIdForActor as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        actorType: 'PRACTITIONER',
        userId: 'user-1',
        requestId: 'request-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { Injectable, NotFoundException } from '@nestjs/common';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';

@Injectable()
export class GetAdminCareChatRequestUseCase {
  constructor(
    private readonly careChatRequestRepository: CareChatRequestRepository,
    private readonly careChatPresenter: CareChatPresenter,
  ) {}

  async execute(input: { requestId: string }) {
    const row = await this.careChatRequestRepository.findById(input.requestId);
    if (!row) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.requestNotFound',
        error: 'CARE_CHAT_REQUEST_NOT_FOUND',
      });
    }

    return {
      item: this.careChatPresenter.presentAdminRequestItem(row),
    };
  }
}

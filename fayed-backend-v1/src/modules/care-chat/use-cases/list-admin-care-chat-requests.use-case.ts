import { Injectable } from '@nestjs/common';
import { ListCareChatRequestsDto } from '../dto/list-care-chat-requests.dto';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';

@Injectable()
export class ListAdminCareChatRequestsUseCase {
  constructor(
    private readonly careChatRequestRepository: CareChatRequestRepository,
    private readonly careChatPresenter: CareChatPresenter,
  ) {}

  async execute(input: { query: ListCareChatRequestsDto }) {
    const [rows, totalItems] = await this.careChatRequestRepository.listForAdmin({
      page: input.query.page,
      limit: input.query.limit,
      status: input.query.status,
    });

    return this.careChatPresenter.presentRequestList({
      items: rows.map((row) => this.careChatPresenter.presentAdminRequestItem(row)),
      page: input.query.page,
      limit: input.query.limit,
      totalItems,
    });
  }
}

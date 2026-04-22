import { Injectable, NotFoundException } from '@nestjs/common';
import { ListCareChatRequestsDto } from '../dto/list-care-chat-requests.dto';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatActorRepository } from '../repositories/care-chat-actor.repository';
import { CareChatConversationRepository } from '../repositories/care-chat-conversation.repository';
import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';

@Injectable()
export class ListMyCareChatRequestsUseCase {
  constructor(
    private readonly careChatActorRepository: CareChatActorRepository,
    private readonly careChatRequestRepository: CareChatRequestRepository,
    private readonly careChatConversationRepository: CareChatConversationRepository,
    private readonly careChatPresenter: CareChatPresenter,
  ) {}

  async execute(input: {
    actorType: 'PATIENT' | 'PRACTITIONER';
    userId: string;
    query: ListCareChatRequestsDto;
  }) {
    const profileId = await this.resolveProfileId(
      input.actorType,
      input.userId,
    );
    const [rows, totalItems] = await this.careChatRequestRepository.listByActor(
      {
        actorType: input.actorType,
        profileId,
        page: input.query.page,
        limit: input.query.limit,
        status: input.query.status,
      },
    );

    const unreadByConversationId =
      await this.careChatConversationRepository.countUnreadByConversationIdsForUser(
        {
          userId: input.userId,
          conversationIds: rows
            .map((row) => row.linkedConversationId)
            .filter((value): value is string => Boolean(value)),
        },
      );

    return this.careChatPresenter.presentRequestList({
      items: rows.map((row) => {
        const conversationId = row.linkedConversationId ?? null;
        const unreadCount = conversationId
          ? (unreadByConversationId.get(conversationId) ?? 0)
          : 0;
        return this.careChatPresenter.presentUserRequestItem(row, {
          unreadCount,
          hasUnread: unreadCount > 0,
        });
      }),
      page: input.query.page,
      limit: input.query.limit,
      totalItems,
    });
  }

  private async resolveProfileId(
    actorType: 'PATIENT' | 'PRACTITIONER',
    userId: string,
  ) {
    if (actorType === 'PATIENT') {
      const patient =
        await this.careChatActorRepository.findPatientProfileByUserId(userId);
      if (!patient) {
        throw new NotFoundException({
          messageKey: 'careChat.errors.patientProfileNotFound',
          error: 'CARE_CHAT_PATIENT_PROFILE_NOT_FOUND',
        });
      }

      return patient.id;
    }

    const practitioner =
      await this.careChatActorRepository.findPractitionerProfileByUserId(
        userId,
      );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.practitionerProfileNotFound',
        error: 'CARE_CHAT_PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    return practitioner.id;
  }
}

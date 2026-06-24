import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCareChatRequestDto } from '../dto/create-care-chat-request.dto';
import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { CareChatActorRepository } from '../repositories/care-chat-actor.repository';
import { CareChatLinkedSessionRepository } from '../repositories/care-chat-linked-session.repository';
import { CareChatRequestRepository } from '../repositories/care-chat-request.repository';
import { CARE_CHAT_DEFAULT_EXPIRY_DAYS } from '../types/care-chat.types';

@Injectable()
export class CreateCareChatRequestUseCase {
  private readonly logger = new Logger(CreateCareChatRequestUseCase.name);

  constructor(
    private readonly careChatActorRepository: CareChatActorRepository,
    private readonly careChatLinkedSessionRepository: CareChatLinkedSessionRepository,
    private readonly careChatRequestRepository: CareChatRequestRepository,
    private readonly careChatPresenter: CareChatPresenter,
  ) {}

  async execute(input: { userId: string; payload: CreateCareChatRequestDto }) {
    const patient =
      await this.careChatActorRepository.findPatientProfileByUserId(
        input.userId,
      );
    if (!patient) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.patientProfileNotFound',
        error: 'CARE_CHAT_PATIENT_PROFILE_NOT_FOUND',
      });
    }

    const practitioner =
      await this.careChatActorRepository.findEligiblePractitionerBySlug(
        input.payload.practitionerSlug,
      );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'careChat.errors.practitionerNotFound',
        error: 'CARE_CHAT_PRACTITIONER_NOT_FOUND',
      });
    }

    if (input.payload.relatedSessionId) {
      const linkedSession =
        await this.careChatLinkedSessionRepository.findOwnedPatientSession(
          input.payload.relatedSessionId,
          patient.id,
        );
      if (!linkedSession || linkedSession.practitionerId !== practitioner.id) {
        throw new NotFoundException({
          messageKey: 'careChat.errors.invalidLinkedSession',
          error: 'CARE_CHAT_INVALID_LINKED_SESSION',
        });
      }
    }

    const now = new Date();
    const activeRequest =
      await this.careChatRequestRepository.findExistingActiveBetweenActors({
        patientId: patient.id,
        practitionerId: practitioner.id,
        now,
      });
    if (activeRequest) {
      throw new ConflictException({
        messageKey: 'careChat.errors.activeRequestAlreadyExists',
        error: 'CARE_CHAT_ACTIVE_REQUEST_ALREADY_EXISTS',
      });
    }

    const expiresAt = new Date(now);
    expiresAt.setUTCDate(
      expiresAt.getUTCDate() + CARE_CHAT_DEFAULT_EXPIRY_DAYS,
    );

    const created = await this.careChatRequestRepository.createRequest({
      patientId: patient.id,
      practitionerId: practitioner.id,
      requestedByUserId: input.userId,
      relatedSessionId: input.payload.relatedSessionId ?? null,
      requestReason: input.payload.reason?.trim() || null,
      expiresAt,
      status: 'PENDING',
      requestedAt: now,
    });

    this.logger.log(
      `Care chat request created (request=${created.id}, patient=${patient.id}, practitioner=${practitioner.id})`,
    );

    return {
      item: this.careChatPresenter.presentUserRequestItem(created),
    };
  }
}

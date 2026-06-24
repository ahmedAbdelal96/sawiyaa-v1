import { BadRequestException, Injectable } from '@nestjs/common';
import { SupportRelatedEntityRepository } from '../repositories/support-related-entity.repository';
import { SupportActorKind } from '../types/support.types';

@Injectable()
export class ValidateSupportLinkedEntitiesService {
  constructor(
    private readonly supportRelatedEntityRepository: SupportRelatedEntityRepository,
  ) {}

  async validate(input: {
    actorKind: SupportActorKind;
    patientProfileId?: string;
    practitionerProfileId?: string;
    relatedSessionId?: string;
    relatedPaymentId?: string;
    relatedInstantBookingRequestId?: string;
    relatedMatchingSessionId?: string;
    relatedAssessmentSubmissionId?: string;
  }) {
    if (input.actorKind === 'PATIENT') {
      await this.validatePatientLinks(input);
      return;
    }

    await this.validatePractitionerLinks(input);
  }

  private async validatePatientLinks(input: {
    patientProfileId?: string;
    relatedSessionId?: string;
    relatedPaymentId?: string;
    relatedInstantBookingRequestId?: string;
    relatedMatchingSessionId?: string;
    relatedAssessmentSubmissionId?: string;
  }) {
    if (!input.patientProfileId) {
      return;
    }

    if (input.relatedSessionId) {
      const owns = await this.supportRelatedEntityRepository.patientOwnsSession(
        input.relatedSessionId,
        input.patientProfileId,
      );
      this.assertOwner(
        owns,
        'support.errors.invalidRelatedSession',
        'SUPPORT_INVALID_RELATED_SESSION',
      );
    }

    if (input.relatedPaymentId) {
      const owns = await this.supportRelatedEntityRepository.patientOwnsPayment(
        input.relatedPaymentId,
        input.patientProfileId,
      );
      this.assertOwner(
        owns,
        'support.errors.invalidRelatedPayment',
        'SUPPORT_INVALID_RELATED_PAYMENT',
      );
    }

    if (input.relatedInstantBookingRequestId) {
      const owns =
        await this.supportRelatedEntityRepository.patientOwnsInstantBookingRequest(
          input.relatedInstantBookingRequestId,
          input.patientProfileId,
        );
      this.assertOwner(
        owns,
        'support.errors.invalidRelatedInstantBookingRequest',
        'SUPPORT_INVALID_RELATED_INSTANT_BOOKING_REQUEST',
      );
    }

    if (input.relatedMatchingSessionId) {
      const owns =
        await this.supportRelatedEntityRepository.patientOwnsMatchingSession(
          input.relatedMatchingSessionId,
          input.patientProfileId,
        );
      this.assertOwner(
        owns,
        'support.errors.invalidRelatedMatchingSession',
        'SUPPORT_INVALID_RELATED_MATCHING_SESSION',
      );
    }

    if (input.relatedAssessmentSubmissionId) {
      const owns =
        await this.supportRelatedEntityRepository.patientOwnsAssessmentSubmission(
          input.relatedAssessmentSubmissionId,
          input.patientProfileId,
        );
      this.assertOwner(
        owns,
        'support.errors.invalidRelatedAssessmentSubmission',
        'SUPPORT_INVALID_RELATED_ASSESSMENT_SUBMISSION',
      );
    }
  }

  private async validatePractitionerLinks(input: {
    practitionerProfileId?: string;
    relatedSessionId?: string;
    relatedPaymentId?: string;
    relatedInstantBookingRequestId?: string;
    relatedMatchingSessionId?: string;
    relatedAssessmentSubmissionId?: string;
  }) {
    if (!input.practitionerProfileId) {
      return;
    }

    if (input.relatedMatchingSessionId || input.relatedAssessmentSubmissionId) {
      throw new BadRequestException({
        messageKey: 'support.errors.unsupportedPractitionerRelatedEntity',
        error: 'SUPPORT_UNSUPPORTED_PRACTITIONER_RELATED_ENTITY',
      });
    }

    if (input.relatedSessionId) {
      const owns =
        await this.supportRelatedEntityRepository.practitionerOwnsSession(
          input.relatedSessionId,
          input.practitionerProfileId,
        );
      this.assertOwner(
        owns,
        'support.errors.invalidRelatedSession',
        'SUPPORT_INVALID_RELATED_SESSION',
      );
    }

    if (input.relatedPaymentId) {
      const owns =
        await this.supportRelatedEntityRepository.practitionerOwnsPayment(
          input.relatedPaymentId,
          input.practitionerProfileId,
        );
      this.assertOwner(
        owns,
        'support.errors.invalidRelatedPayment',
        'SUPPORT_INVALID_RELATED_PAYMENT',
      );
    }

    if (input.relatedInstantBookingRequestId) {
      const owns =
        await this.supportRelatedEntityRepository.practitionerOwnsInstantBookingRequest(
          input.relatedInstantBookingRequestId,
          input.practitionerProfileId,
        );
      this.assertOwner(
        owns,
        'support.errors.invalidRelatedInstantBookingRequest',
        'SUPPORT_INVALID_RELATED_INSTANT_BOOKING_REQUEST',
      );
    }
  }

  private assertOwner(count: number, messageKey: string, error: string) {
    if (count > 0) {
      return;
    }
    throw new BadRequestException({
      messageKey,
      error,
    });
  }
}

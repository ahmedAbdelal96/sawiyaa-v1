import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ConversationParticipantRole,
  SupportTicketPriority,
  SupportTicketType,
} from '@prisma/client';
import { SupportPresenter } from '../presenters/support.presenter';
import { SupportActorRepository } from '../repositories/support-actor.repository';
import { SupportTicketRepository } from '../repositories/support-ticket.repository';
import {
  AdminSupportReporterRoleDto,
  CreateAdminSupportTicketForReporterDto,
} from '../dto/create-admin-support-ticket-for-reporter.dto';

@Injectable()
export class CreateAdminSupportTicketForReporterUseCase {
  private readonly logger = new Logger(
    CreateAdminSupportTicketForReporterUseCase.name,
  );

  constructor(
    private readonly supportActorRepository: SupportActorRepository,
    private readonly supportTicketRepository: SupportTicketRepository,
    private readonly supportPresenter: SupportPresenter,
  ) {}

  async execute(input: { payload: CreateAdminSupportTicketForReporterDto }) {
    const role = input.payload.reporterRole;
    const reporterUserId = input.payload.reporterUserId;

    if (role === AdminSupportReporterRoleDto.PATIENT) {
      const patient =
        await this.supportActorRepository.findPatientProfileByUserId(
          reporterUserId,
        );
      if (!patient) {
        throw new NotFoundException({
          messageKey: 'support.errors.patientProfileNotFound',
          error: 'SUPPORT_PATIENT_PROFILE_NOT_FOUND',
        });
      }

      const created = await this.supportTicketRepository.createTicket({
        openedByUserId: reporterUserId,
        createdByRole: ConversationParticipantRole.PATIENT,
        actorKind: 'PATIENT',
        patientProfileId: patient.id,
        category: input.payload.category ?? SupportTicketType.GENERAL,
        subject: (
          input.payload.subject ?? 'متابعة من فريق الدعم بخصوص بلاغك'
        ).trim(),
        description: (
          input.payload.description ??
          'مرحبًا، نرجو مشاركتنا التفاصيل اللازمة لمتابعة البلاغ.'
        ).trim(),
        priority: input.payload.priority ?? SupportTicketPriority.NORMAL,
        seedInitialMessage: false,
      });

      this.logger.log(
        `Admin created outreach support ticket for patient reporter (ticket=${created.id}, reporterUserId=${reporterUserId})`,
      );

      return {
        item: this.supportPresenter.presentAdminTicketDetails(created),
      };
    }

    const practitioner =
      await this.supportActorRepository.findPractitionerProfileByUserId(
        reporterUserId,
      );
    if (!practitioner) {
      throw new NotFoundException({
        messageKey: 'support.errors.practitionerProfileNotFound',
        error: 'SUPPORT_PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const created = await this.supportTicketRepository.createTicket({
      openedByUserId: reporterUserId,
      createdByRole: ConversationParticipantRole.PRACTITIONER,
      actorKind: 'PRACTITIONER',
      practitionerProfileId: practitioner.id,
      category: input.payload.category ?? SupportTicketType.GENERAL,
      subject: (
        input.payload.subject ?? 'Support follow-up from the operations team'
      ).trim(),
      description: (
        input.payload.description ??
        'Hello, please share any additional details so we can continue handling your report.'
      ).trim(),
      priority: input.payload.priority ?? SupportTicketPriority.NORMAL,
      seedInitialMessage: false,
    });

    this.logger.log(
      `Admin created outreach support ticket for practitioner reporter (ticket=${created.id}, reporterUserId=${reporterUserId})`,
    );

    return {
      item: this.supportPresenter.presentAdminTicketDetails(created),
    };
  }
}

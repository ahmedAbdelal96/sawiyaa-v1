import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AcademyProgramEnrollmentStatus,
  PaymentEventType,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  SecurityAuditOutcome,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '@common/prisma/prisma.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import {
  SecurityAuditActorType,
  SecurityAuditSource,
} from '@common/security-audit/security-audit.types';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { MarkPaymentSucceededUseCase } from '@modules/payments/use-cases/mark-payment-succeeded.use-case';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { ConfirmAdminAcademyProgramEnrollmentPaymentDto } from '../dto/confirm-admin-academy-program-enrollment-payment.dto';

@Injectable()
export class ConfirmAdminAcademyProgramEnrollmentPaymentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
    private readonly markPaymentSucceededUseCase: MarkPaymentSucceededUseCase,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async execute(input: {
    enrollmentId: string;
    locale: SupportedLocale;
    actorUserId: string;
    actorRoles: string[];
    payload: ConfirmAdminAcademyProgramEnrollmentPaymentDto;
  }) {
    const providerEventRef = `academy-admin-manual:${input.enrollmentId}:${randomUUID()}`;
    const paymentReference = input.payload.paymentReference?.trim() || null;
    const notes = input.payload.notes?.trim() || null;

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT id FROM "AcademyProgramEnrollment" WHERE id = ${input.enrollmentId}::uuid FOR UPDATE
      `;
      const current = await tx.academyProgramEnrollment.findUnique({
        where: { id: input.enrollmentId },
        include: { academyProgram: true },
      });

      if (!current) {
        throw new NotFoundException({
          messageKey: 'academyProgram.errors.enrollmentNotFound',
          error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
        });
      }

      if (current.status === AcademyProgramEnrollmentStatus.CONFIRMED) {
        throw new ConflictException({
          messageKey: 'academyProgram.errors.enrollmentAlreadyConfirmed',
          error: 'ACADEMY_PROGRAM_ENROLLMENT_ALREADY_CONFIRMED',
        });
      }

      if (
        current.status === AcademyProgramEnrollmentStatus.CANCELLED ||
        current.status === AcademyProgramEnrollmentStatus.EXPIRED
      ) {
        throw new ConflictException({
          messageKey: 'academyProgram.errors.enrollmentNotPayable',
          error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_PAYABLE',
        });
      }

      const payment = await tx.payment.create({
        data: {
          sessionId: null,
          patientId: current.userId,
          practitionerId: null,
          paymentPurpose: PaymentPurpose.ACADEMY_PROGRAM_ENROLLMENT,
          provider: PaymentProvider.MANUAL,
          status: PaymentStatus.CREATED,
          amountSubtotal: current.selectedAmountSnapshot,
          amountDiscount: new Prisma.Decimal(0),
          amountTotal: current.selectedAmountSnapshot,
          amountFromWallet: new Prisma.Decimal(0),
          amountFromGateway: current.selectedAmountSnapshot,
          currencyCode: current.selectedCurrencyCode,
          metadataJson: {
            source: 'academy-admin-manual-confirmation',
            academyProgramId: current.academyProgramId,
            academyProgramEnrollmentId: current.id,
            learnerId: current.academyLearnerId,
            paymentReference,
            notes,
          },
        },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: PaymentEventType.PAYMENT_CREATED,
          actorType: SecurityAuditActorType.USER,
          source: SecurityAuditSource.HTTP_REQUEST,
          actorUserId: input.actorUserId,
          actorRolesJson: input.actorRoles,
          providerEventRef,
          payloadJson: {
            source: 'academy-admin-manual-confirmation',
            academyProgramEnrollmentId: current.id,
            paymentReference,
          },
        },
      });

      const attempt = await tx.academyProgramPaymentAttempt.create({
        data: {
          academyProgramId: current.academyProgramId,
          academyProgramEnrollmentId: current.id,
          paymentId: payment.id,
          provider: PaymentProvider.MANUAL,
          status: PaymentStatus.CREATED,
          amountSubtotal: current.selectedAmountSnapshot,
          amountDiscount: new Prisma.Decimal(0),
          amountTotal: current.selectedAmountSnapshot,
          currencyCode: current.selectedCurrencyCode,
        },
      });

      await tx.academyProgramEnrollment.update({
        where: { id: current.id },
        data: { paymentId: payment.id, paymentStatus: PaymentStatus.CREATED },
      });

      await this.securityAuditService.recordRequired(tx, {
        action: 'academy.programEnrollment.payment.manualConfirm',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorType: SecurityAuditActorType.USER,
        source: SecurityAuditSource.HTTP_REQUEST,
        actorUserId: input.actorUserId,
        resourceType: 'AcademyProgramEnrollment',
        resourceId: current.id,
        targetUserId: current.userId,
        metadata: {
          paymentId: payment.id,
          paymentAttemptId: attempt.id,
          paymentReference,
          notes,
        },
      });

      return { paymentId: payment.id, paymentAttemptId: attempt.id };
    });

    await this.markPaymentSucceededUseCase.execute({
      paymentId: created.paymentId,
      providerEventRef,
      source: 'MANUAL_REVIEW',
      actorUserId: input.actorUserId,
      actorRoles: input.actorRoles,
      payload: {
        source: 'academy-admin-manual-confirmation',
        academyProgramEnrollmentId: input.enrollmentId,
        paymentReference,
        notes,
      },
    });

    await this.prisma.academyProgramPaymentAttempt.update({
      where: { id: created.paymentAttemptId },
      data: {
        status: PaymentStatus.CAPTURED,
        confirmedAt: new Date(),
        providerPaymentRef: paymentReference,
      },
    });

    const enrollment =
      await this.academyProgramEnrollmentRepository.findEnrollmentByIdForAdmin(
        input.enrollmentId,
      );
    if (!enrollment) {
      throw new NotFoundException({
        error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
      });
    }

    return {
      item: this.academyProgramEnrollmentPresenter.presentAdminEnrollmentDetail(
        enrollment,
        input.locale,
      ),
      actorUserId: input.actorUserId,
    };
  }
}

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AcademyProgramEnrollmentStatus, PaymentStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PaymentGeoContextService } from '@modules/payments/services/payment-geo-context.service';
import { AcademyRepository } from '../../repositories/academy.repository';
import { resolveAcademyCheckoutPricing } from '../../utils/academy-pricing.util';
import { CreateAdminAcademyProgramEnrollmentDto } from '../dto/create-admin-academy-program-enrollment.dto';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';

@Injectable()
export class CreateAdminAcademyProgramEnrollmentUseCase {
  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly paymentGeoContextService: PaymentGeoContextService,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
  ) {}

  async execute(input: {
    programId: string;
    locale: SupportedLocale;
    actorUserId: string;
    payload: CreateAdminAcademyProgramEnrollmentDto;
  }) {
    const program = await this.academyProgramRepository.findProgramById(input.programId);

    if (!program) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    if (program.archivedAt) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.archivedReadOnly',
        error: 'ACADEMY_PROGRAM_ARCHIVED_READ_ONLY',
      });
    }

    const phoneNumber = input.payload.phoneNumber.trim();
    const existingLearner = await this.academyRepository.findLearnerByPhoneNumber(phoneNumber);
    if (existingLearner) {
      const existingEnrollment =
        await this.academyProgramEnrollmentRepository.findEnrollmentByProgramAndLearner(
          program.id,
          existingLearner.id,
        );

      if (existingEnrollment) {
        throw new ConflictException({
          messageKey: 'academyProgram.errors.enrollmentAlreadyExists',
          error: 'ACADEMY_PROGRAM_ENROLLMENT_ALREADY_EXISTS',
        });
      }
    }

    const countryResolution = await this.paymentGeoContextService.resolveCountryResolution({
      phoneNumber,
      existingCountryCode: existingLearner?.countryCode ?? null,
    });

    try {
      const learner = await this.academyRepository.upsertLearner({
        fullName: input.payload.fullName.trim(),
        phoneNumber,
        whatsappNumber: input.payload.whatsappNumber?.trim() || null,
        email: input.payload.email?.trim() || null,
        countryCode: countryResolution.resolvedCountryCode,
        countryCodeDeclared: null,
        countryCodeSource: countryResolution.countrySource,
        countryCodeMismatch: countryResolution.countryMismatch,
        sourceLabel: 'admin-manual',
        city: input.payload.city?.trim() || null,
        jobTitle: input.payload.jobTitle?.trim() || null,
        employer: input.payload.employer?.trim() || null,
        education: input.payload.education?.trim() || null,
        notes: input.payload.notes?.trim() || null,
      });

      if (!existingLearner) {
        const existingEnrollment =
          await this.academyProgramEnrollmentRepository.findEnrollmentByProgramAndLearner(
            program.id,
            learner.id,
          );

        if (existingEnrollment) {
          throw new ConflictException({
            messageKey: 'academyProgram.errors.enrollmentAlreadyExists',
            error: 'ACADEMY_PROGRAM_ENROLLMENT_ALREADY_EXISTS',
          });
        }
      }

      const pricing = resolveAcademyCheckoutPricing({
        priceAmountEgp: program.priceEgp,
        priceAmountUsd: program.priceUsd,
        priceAmount: null,
        currencyCode: null,
        resolvedCountryCode: countryResolution.resolvedCountryCode,
      });

      const selectedCurrencyCode =
        pricing.currencyCode ?? (countryResolution.resolvedCountryCode === 'EG' ? 'EGP' : 'USD');
      const selectedAmountSnapshot = pricing.amount ?? '0';
      const now = new Date();
      const enrollment = await this.academyProgramEnrollmentRepository.createEnrollment({
        academyProgramId: program.id,
        academyLearnerId: learner.id,
        publicAccessToken: randomUUID(),
        status: AcademyProgramEnrollmentStatus.CONFIRMED,
        paymentStatus: PaymentStatus.CREATED,
        paymentId: null,
        registeredAt: now,
        lockedAt: now,
        seatReservedAt: now,
        seatReservationExpiresAt: null,
        confirmedAt: now,
        cancelledAt: null,
        expiredAt: null,
        completedAt: null,
        certificateIssuedAt: null,
        certificateFileStoragePath: null,
        certificateFileName: null,
        certificateUploadedAt: null,
        certificateUploadedByUserId: null,
        selectedCurrencyCode,
        selectedAmountSnapshot,
        submittedCountry: countryResolution.declaredCountryCode,
        lockedCountry: countryResolution.resolvedCountryCode,
        lockedCountrySource: countryResolution.countrySource,
        contactFullName: input.payload.fullName.trim(),
        contactEmail: input.payload.email?.trim() || null,
        contactPhone: phoneNumber,
        contactWhatsapp: input.payload.whatsappNumber?.trim() || null,
        contactCountry: countryResolution.resolvedCountryCode,
        contactNotes: input.payload.notes?.trim() || null,
        userId: null,
      });

      return {
        item: this.academyProgramEnrollmentPresenter.presentEnrollmentItem(
          enrollment,
          input.locale,
        ),
      };
    } catch (error) {
      if ((error as { code?: string } | null | undefined)?.code === 'P2002') {
        const target = (error as { meta?: { target?: string[] | string } } | null | undefined)?.meta?.target;
        const targetText = Array.isArray(target) ? target.join(',') : `${target ?? ''}`;

        throw new ConflictException({
          messageKey:
            targetText.includes('academyProgramId') && targetText.includes('academyLearnerId')
              ? 'academyProgram.errors.enrollmentAlreadyExists'
              : 'academyProgram.errors.learnerContactAlreadyExists',
          error:
            targetText.includes('academyProgramId') && targetText.includes('academyLearnerId')
              ? 'ACADEMY_PROGRAM_ENROLLMENT_ALREADY_EXISTS'
              : 'ACADEMY_PROGRAM_LEARNER_CONTACT_ALREADY_EXISTS',
        });
      }

      throw error;
    }
  }
}

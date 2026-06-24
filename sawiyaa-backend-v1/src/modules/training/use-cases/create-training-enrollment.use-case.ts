import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourseStatus,
  CourseVisibility,
  EnrollmentStatus,
  MarketType,
  PaymentEventType,
  PaymentPurpose,
  PaymentStatus,
  PaymentProvider,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { resolveProviderForCurrency } from '@common/payments/payment-region.resolver';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { PaymentGeoContextService } from '@modules/payments/services/payment-geo-context.service';
import { PaymentProviderRegistryService } from '@modules/payments/services/payment-provider-registry.service';
import { PaymentProviderResolverService } from '@modules/payments/services/payment-provider-resolver.service';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { ValidatePaymentStatusTransitionService } from '@modules/payments/services/validate-payment-status-transition.service';
import { CreateTrainingEnrollmentDto } from '../dto/create-training-enrollment.dto';
import { TrainingPresenter } from '../presenters/training.presenter';
import { TrainingRepository } from '../repositories/training.repository';
import { ResolveTrainingScheduleEnrollmentAvailabilityService } from '../services/resolve-training-schedule-enrollment-availability.service';

type CreateTrainingEnrollmentInput = CreateTrainingEnrollmentDto & {
  forceRefreshPayment?: boolean;
};

@Injectable()
export class CreateTrainingEnrollmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingRepository: TrainingRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGeoContextService: PaymentGeoContextService,
    private readonly paymentProviderResolverService: PaymentProviderResolverService,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
    private readonly paymentProviderRegistryService: PaymentProviderRegistryService,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly resolveTrainingScheduleEnrollmentAvailabilityService: ResolveTrainingScheduleEnrollmentAvailabilityService,
    private readonly trainingPresenter: TrainingPresenter,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    scheduleId: string;
    payload: CreateTrainingEnrollmentInput;
  }) {
    const patient = await this.trainingRepository.findPatientProfileByUserId(
      input.userId,
    );
    if (!patient) {
      throw new NotFoundException({
        messageKey: 'training.errors.patientNotFound',
        error: 'TRAINING_PATIENT_NOT_FOUND',
      });
    }

    const schedule = await this.trainingRepository.findScheduleById(
      input.scheduleId,
    );
    if (!schedule || !schedule.course) {
      throw new NotFoundException({
        messageKey: 'training.errors.scheduleNotFound',
        error: 'TRAINING_SCHEDULE_NOT_FOUND',
      });
    }

    if (
      schedule.course.status !== CourseStatus.PUBLISHED ||
      schedule.course.visibility !== CourseVisibility.PUBLIC
    ) {
      throw new BadRequestException({
        messageKey: 'training.errors.courseNotEnrollable',
        error: 'TRAINING_COURSE_NOT_ENROLLABLE',
      });
    }

    const enrollmentCountsByScheduleId =
      await this.trainingRepository.countEnrollmentsByScheduleIds([
        schedule.id,
      ]);
    const occupiedSeats = enrollmentCountsByScheduleId[schedule.id] ?? 0;

    const maxEnrollments =
      schedule.maxEnrollmentsOverride ?? schedule.course.maxEnrollments ?? null;
    const availability =
      this.resolveTrainingScheduleEnrollmentAvailabilityService.resolve({
        status: schedule.status,
        enrollmentOpenAt: schedule.enrollmentOpenAt,
        enrollmentCloseAt: schedule.enrollmentCloseAt,
        startsAt: schedule.startsAt,
        maxEnrollments,
        enrolledSeats: occupiedSeats,
      });
    if (!availability.isEnrollmentOpen) {
      throw new BadRequestException({
        messageKey: 'training.errors.scheduleNotEnrollable',
        error: 'TRAINING_SCHEDULE_NOT_ENROLLABLE',
        messageParams: {
          reason: availability.reason,
        },
      });
    }

    const existing =
      await this.trainingRepository.findEnrollmentByScheduleAndUser(
        schedule.id,
        input.userId,
      );

    if (
      existing &&
      existing.enrollmentStatus !== EnrollmentStatus.PENDING_PAYMENT
    ) {
      throw new ConflictException({
        messageKey: 'training.errors.enrollmentAlreadyExists',
        error: 'TRAINING_ENROLLMENT_ALREADY_EXISTS',
      });
    }

    const pricing = this.resolvePricing(schedule);
    const patientCountryIsoCode = patient.country?.isoCode ?? null;
    if (!patientCountryIsoCode) {
      throw new BadRequestException({
        messageKey: 'payments.errors.paymentRoutingAmbiguous',
        error: 'PAYMENT_ROUTING_AMBIGUOUS',
      });
    }

    const provider = this.resolveProvider({
      currencyCode: pricing.currencyCode,
      patientCountryIsoCode,
    });
    const providerAdapter = this.paymentProviderRegistryService.get(provider, {
      currencyCode: pricing.currencyCode,
      checkoutCountryIsoCode: patientCountryIsoCode,
      operatingCountryIsoCode: null,
    });
    const countrySnapshot = this.paymentGeoContextService.buildCountrySnapshot({
      declaredCountryCode: patientCountryIsoCode,
      resolvedCountryCode: patientCountryIsoCode,
      countrySource: 'ACCOUNT',
      countryMismatch: false,
      phoneCountryCode: null,
      operatingCountryCode: null,
      checkoutCountryCode: patientCountryIsoCode,
      pricingCurrencyCode: pricing.currencyCode,
      pricingMarketType:
        pricing.currencyCode === 'EGP'
          ? MarketType.LOCAL
          : MarketType.CROSS_BORDER,
      provider,
    });

    const enrollment =
      existing ??
      (await this.trainingRepository.createEnrollment({
        courseId: schedule.course.id,
        courseScheduleId: schedule.id,
        userId: input.userId,
        enrollmentStatus: EnrollmentStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.CREATED,
      }));
    const providerRedirectionUrl =
      provider === PaymentProvider.PAYMOB
        ? this.resolveTrainingPaymentReturnUrl({
            locale: input.locale,
            enrollmentId: enrollment.id,
            returnUrl: input.payload.returnUrl ?? null,
          })
        : null;

    const activePaymentStatuses: PaymentStatus[] = [
      PaymentStatus.CREATED,
      PaymentStatus.PENDING,
      PaymentStatus.REQUIRES_ACTION,
      PaymentStatus.AUTHORIZED,
    ];

    if (!input.payload.forceRefreshPayment && existing?.paymentId) {
      const previousPayment = await this.paymentRepository.findById(
        existing.paymentId,
      );
      if (
        previousPayment &&
        activePaymentStatuses.includes(previousPayment.status)
      ) {
        return {
          item: this.trainingPresenter.presentEnrollmentItem(
            existing,
            input.locale,
          ),
        };
      }
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await this.paymentRepository.createPayment(
        {
          sessionId: null,
          patientId: patient.id,
          practitionerId: null,
          paymentPurpose: PaymentPurpose.COURSE_ENROLLMENT,
          provider,
          status: PaymentStatus.CREATED,
          amountSubtotal: pricing.amount,
          amountDiscount: '0',
          amountTotal: pricing.amount,
          currencyCode: pricing.currencyCode,
          metadataJson: {
            source: 'training-enrollment-payment-initiation',
            enrollmentId: enrollment.id,
            courseId: schedule.course.id,
            scheduleId: schedule.id,
            couponCode: input.payload.couponCode ?? null,
            countrySnapshot,
          },
        },
        tx,
      );

      await tx.trainingEnrollmentPaymentAttempt.create({
        data: {
          enrollmentId: enrollment.id,
          paymentId: createdPayment.id,
          provider,
          status: PaymentStatus.CREATED,
          amountSubtotal: pricing.amount,
          amountDiscount: '0',
          amountTotal: pricing.amount,
          currencyCode: pricing.currencyCode,
          metadataJson: {
            source: 'training-enrollment-payment-initiation',
            enrollmentId: enrollment.id,
            courseId: schedule.course.id,
            scheduleId: schedule.id,
            couponCode: input.payload.couponCode ?? null,
            countrySnapshot,
          },
        },
      });

      await this.paymentRepository.createEvent(
        {
          paymentId: createdPayment.id,
          eventType: PaymentEventType.PAYMENT_CREATED,
          payloadJson: {
            source: 'training-enrollment-initiation',
            enrollmentId: enrollment.id,
          },
        },
        tx,
      );

      await this.trainingRepository.updateEnrollment(enrollment.id, {
        paymentId: createdPayment.id,
        paymentStatus: PaymentStatus.CREATED,
      });

      return createdPayment;
    });

    let providerResult: Awaited<
      ReturnType<typeof providerAdapter.initiateSessionPayment>
    > | null = null;
    try {
      providerResult = await providerAdapter.initiateSessionPayment({
        paymentId: payment.id,
        amountMinor: this.toMinorUnits(pricing.amount),
        currency: pricing.currencyCode,
        description: `Training enrollment payment: ${schedule.scheduleCode}`,
        sessionId: schedule.id,
        patientEmail: patient.user.emails[0]?.email ?? null,
        redirectionUrl: providerRedirectionUrl,
        checkoutCountryIsoCode: patientCountryIsoCode,
        operatingCountryIsoCode: null,
      });
    } catch (error) {
      const failureReason =
        error instanceof Error
          ? error.message
          : 'TRAINING_PAYMENT_PROVIDER_ERROR';
      await this.prisma.$transaction(async (tx) => {
        await this.paymentRepository.updateStatus(
          payment.id,
          {
            status: PaymentStatus.FAILED,
            failedAt: new Date(),
            metadataJson: {
              source: 'training-enrollment-payment-initiation',
              enrollmentId: enrollment.id,
              courseId: schedule.course.id,
              scheduleId: schedule.id,
              countrySnapshot,
              failureReason,
            },
          },
          tx,
        );

        await this.paymentRepository.createEvent(
          {
            paymentId: payment.id,
            eventType: PaymentEventType.PAYMENT_FAILED,
            payloadJson: {
              source: 'training-enrollment-initiation',
              enrollmentId: enrollment.id,
              failureReason,
            },
          },
          tx,
        );

        await this.trainingRepository.updateEnrollment(enrollment.id, {
          paymentStatus: PaymentStatus.FAILED,
        });

        await tx.trainingEnrollmentPaymentAttempt.update({
          where: {
            paymentId: payment.id,
          },
          data: {
            status: PaymentStatus.FAILED,
            failedAt: new Date(),
            failureReason,
          },
        });
      });

      throw error;
    }

    if (!providerResult) {
      throw new BadRequestException({
        messageKey: 'training.errors.paymentProviderUnavailable',
        error: 'TRAINING_PAYMENT_PROVIDER_UNAVAILABLE',
      });
    }

    this.validatePaymentStatusTransitionService.assertCanTransition(
      payment.status,
      providerResult.status,
    );

    await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await this.paymentRepository.updateStatus(
        payment.id,
        {
          status: providerResult.status,
          providerPaymentRef: providerResult.providerPaymentRef,
          providerOrderRef: providerResult.providerOrderRef ?? null,
          providerCustomerRef: providerResult.providerCustomerRef ?? null,
          metadataJson: {
            source: 'training-enrollment-payment-initiation',
            checkoutUrl: providerResult.checkoutUrl ?? null,
            clientSecret: providerResult.clientSecret ?? null,
            enrollmentId: enrollment.id,
            courseId: schedule.course.id,
            scheduleId: schedule.id,
            countrySnapshot,
            ...(providerResult.metadata ?? {}),
          },
        },
        tx,
      );

      await tx.trainingEnrollmentPaymentAttempt.update({
        where: {
          paymentId: payment.id,
        },
        data: {
          status: providerResult.status,
          providerPaymentRef: providerResult.providerPaymentRef,
          providerOrderRef: providerResult.providerOrderRef ?? null,
          providerCustomerRef: providerResult.providerCustomerRef ?? null,
          checkoutUrl: providerResult.checkoutUrl ?? null,
          clientSecret: providerResult.clientSecret ?? null,
          failureReason: null,
          metadataJson: {
            source: 'training-enrollment-payment-initiation',
            enrollmentId: enrollment.id,
            courseId: schedule.course.id,
            scheduleId: schedule.id,
            couponCode: input.payload.couponCode ?? null,
            countrySnapshot,
            ...(providerResult.metadata ?? {}),
          },
        },
      });

      await this.paymentRepository.createEvent(
        {
          paymentId: payment.id,
          eventType: PaymentEventType.PROVIDER_CHECKOUT_CREATED,
          providerEventRef: providerResult.providerPaymentRef,
          payloadJson: {
            provider,
            checkoutUrl: providerResult.checkoutUrl ?? null,
            clientSecret: providerResult.clientSecret ? 'present' : null,
          },
        },
        tx,
      );

      await this.trainingRepository.updateEnrollment(enrollment.id, {
        paymentStatus: updatedPayment.status,
      });
    });

    const refreshed = await this.trainingRepository.findEnrollmentByIdForUser(
      enrollment.id,
      input.userId,
    );
    if (!refreshed) {
      throw new NotFoundException({
        messageKey: 'training.errors.enrollmentNotFound',
        error: 'TRAINING_ENROLLMENT_NOT_FOUND',
      });
    }

    return {
      item: this.trainingPresenter.presentEnrollmentItem(
        refreshed,
        input.locale,
      ),
    };
  }

  private resolvePricing(schedule: {
    priceOverrideAmount: { toString(): string } | null;
    currencyCodeOverride: string | null;
    course: {
      priceAmount: { toString(): string } | null;
      currencyCode: string | null;
    };
  }) {
    const amount =
      schedule.priceOverrideAmount?.toString() ??
      schedule.course.priceAmount?.toString() ??
      null;
    const currencyCode =
      schedule.currencyCodeOverride?.trim().toUpperCase() ??
      schedule.course.currencyCode?.trim().toUpperCase() ??
      null;

    if (!amount || !currencyCode) {
      throw new BadRequestException({
        messageKey: 'training.errors.missingSchedulePricing',
        error: 'TRAINING_MISSING_SCHEDULE_PRICING',
      });
    }

    return { amount, currencyCode };
  }

  private resolveProvider(input: {
    currencyCode: string;
    patientCountryIsoCode: string | null;
  }) {
    const provider = resolveProviderForCurrency(input.currencyCode);
    if (provider === PaymentProvider.PAYMOB) {
      const normalizedCurrencyCode = input.currencyCode.trim().toUpperCase();

      if (normalizedCurrencyCode === 'USD') {
        return this.paymentProviderResolverService.resolveProvider({
          currencyCode: 'USD',
          commissionMarketType: MarketType.CROSS_BORDER,
          operatingCountryIsoCode: null,
          checkoutCountryIsoCode: input.patientCountryIsoCode,
        });
      }

      return this.paymentProviderResolverService.resolveProvider({
        currencyCode: 'EGP',
        commissionMarketType: MarketType.LOCAL,
        operatingCountryIsoCode: input.patientCountryIsoCode,
        checkoutCountryIsoCode: input.patientCountryIsoCode,
      });
    }

    throw new BadRequestException({
      messageKey: 'training.errors.unsupportedEnrollmentCurrency',
      error: 'TRAINING_UNSUPPORTED_ENROLLMENT_CURRENCY',
      messageParams: {
        currencyCode: input.currencyCode,
      },
    });
  }

  private toMinorUnits(amount: string): number {
    return Math.round(Number(amount) * 100);
  }

  private resolveTrainingPaymentReturnUrl(input: {
    locale: SupportedLocale;
    enrollmentId: string;
    returnUrl: string | null;
  }): string {
    const trustedReturnUrl =
      this.paymentRuntimeConfigService.resolveTrustedReturnUrl(input.returnUrl);

    if (trustedReturnUrl) {
      return trustedReturnUrl;
    }

    const appBaseUrl = this.paymentRuntimeConfigService
      .getAppBaseUrl()
      .replace(/\/$/, '');

    return `${appBaseUrl}/${input.locale}/patient/training/${input.enrollmentId}/payment-return`;
  }
}

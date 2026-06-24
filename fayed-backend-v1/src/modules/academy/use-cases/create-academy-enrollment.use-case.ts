import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AcademyEnrollmentStatus,
  MarketType,
  PaymentEventType,
  PaymentPurpose,
  PaymentStatus,
  PaymentProvider,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { resolveProviderForCurrency } from '@common/payments/payment-region.resolver';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { PaymentGeoContextService } from '@modules/payments/services/payment-geo-context.service';
import { PaymentProviderRegistryService } from '@modules/payments/services/payment-provider-registry.service';
import { PaymentProviderResolverService } from '@modules/payments/services/payment-provider-resolver.service';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { ValidatePaymentStatusTransitionService } from '@modules/payments/services/validate-payment-status-transition.service';
import { CreateAcademyEnrollmentDto } from '../dto/create-academy-enrollment.dto';
import { AcademyPresenter } from '../presenters/academy.presenter';
import { AcademyRepository } from '../repositories/academy.repository';
import { resolveAcademyCheckoutPricing } from '../utils/academy-pricing.util';

@Injectable()
export class CreateAcademyEnrollmentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academyRepository: AcademyRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGeoContextService: PaymentGeoContextService,
    private readonly paymentProviderResolverService: PaymentProviderResolverService,
    private readonly paymentProviderRegistryService: PaymentProviderRegistryService,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly academyPresenter: AcademyPresenter,
  ) {}

  async execute(input: {
    slug: string;
    locale: SupportedLocale;
    payload: CreateAcademyEnrollmentDto;
  }) {
    const course = await this.academyRepository.findPublicCourseBySlug(
      input.slug,
    );
    if (!course) {
      throw new NotFoundException({
        messageKey: 'academy.errors.notFound',
        error: 'ACADEMY_COURSE_NOT_FOUND',
      });
    }

    const phoneNumber = input.payload.phoneNumber.trim();
    const existingLearner =
      await this.academyRepository.findLearnerByPhoneNumber(phoneNumber);
    const countryResolution =
      await this.paymentGeoContextService.resolveCountryResolution({
        phoneNumber,
        existingCountryCode: existingLearner?.countryCode ?? null,
      });

    const learner = await this.upsertLearnerSafely({
      fullName: input.payload.fullName.trim(),
      phoneNumber,
      whatsappNumber: input.payload.whatsappNumber?.trim() || null,
      email: input.payload.email?.trim() || null,
      countryCode: countryResolution.resolvedCountryCode,
      countryCodeDeclared: null,
      countryCodeSource: countryResolution.countrySource,
      countryCodeMismatch: countryResolution.countryMismatch,
      sourceLabel: input.payload.sourceLabel?.trim() || 'public-academy',
    });

    const existing =
      await this.academyRepository.findEnrollmentByCourseAndLearner(
        course.id,
        learner.id,
      );

    if (
      existing &&
      (existing.enrollmentStatus === AcademyEnrollmentStatus.PAID ||
        existing.enrollmentStatus === AcademyEnrollmentStatus.CONFIRMED)
    ) {
      return {
        item: this.academyPresenter.presentEnrollmentItem(existing),
      };
    }

    const publicAccessToken = randomUUID();
    const isFree =
      course.priceAmountEgp === null &&
      course.priceAmountUsd === null &&
      course.priceAmount === null &&
      course.currencyCode === null;

    if (isFree) {
      const created = await this.createEnrollmentSafely({
        academyCourseId: course.id,
        academyLearnerId: learner.id,
        publicAccessToken,
        enrollmentStatus: AcademyEnrollmentStatus.CONFIRMED,
        paymentStatus: PaymentStatus.CAPTURED,
        confirmedAt: new Date(),
      });

      await this.academyRepository.createActivityLog({
        academyCourseId: course.id,
        academyEnrollmentId: created.id,
        action: 'ENROLLMENT_CREATED',
        note: 'Free academy enrollment confirmed immediately.',
      });

      return {
        item: this.academyPresenter.presentEnrollmentItem(created),
      };
    }

    const pricing = resolveAcademyCheckoutPricing({
      priceAmountEgp: course.priceAmountEgp,
      priceAmountUsd: course.priceAmountUsd,
      priceAmount: course.priceAmount,
      currencyCode: course.currencyCode,
      resolvedCountryCode: countryResolution.resolvedCountryCode,
    });
    if (!pricing.amount || !pricing.currencyCode) {
      throw new BadRequestException({
        messageKey: 'academy.errors.missingPricing',
        error: 'ACADEMY_MISSING_PRICING',
      });
    }

    const provider = this.resolveProvider({
      currencyCode: pricing.currencyCode,
      learnerCountryIsoCode: learner.countryCode ?? null,
    });
    const providerAdapter = this.paymentProviderRegistryService.get(provider);

    const enrollment =
      existing ??
      (await this.createEnrollmentSafely({
        academyCourseId: course.id,
        academyLearnerId: learner.id,
        publicAccessToken,
        enrollmentStatus: AcademyEnrollmentStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.CREATED,
      }));

    let paymentAttemptId: string | null = null;

    const payment = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await this.paymentRepository.createPayment(
        {
          sessionId: null,
          patientId: null,
          practitionerId: null,
          paymentPurpose: PaymentPurpose.COURSE_ENROLLMENT,
          provider,
          status: PaymentStatus.CREATED,
          amountSubtotal: pricing.amount,
          amountDiscount: '0',
          amountTotal: pricing.amount,
          currencyCode: pricing.currencyCode,
          metadataJson: {
            source: 'academy-enrollment',
            academyCourseId: course.id,
            academyEnrollmentId: enrollment.id,
            learnerId: learner.id,
            countrySnapshot: this.paymentGeoContextService.buildCountrySnapshot(
              {
                declaredCountryCode: countryResolution.declaredCountryCode,
                resolvedCountryCode: countryResolution.resolvedCountryCode,
                countrySource: countryResolution.countrySource,
                countryMismatch: countryResolution.countryMismatch,
                phoneCountryCode: countryResolution.phoneCountryCode,
                operatingCountryCode: null,
                checkoutCountryCode: countryResolution.resolvedCountryCode,
                pricingCurrencyCode: pricing.currencyCode,
                pricingMarketType:
                  pricing.currencyCode === 'EGP'
                    ? MarketType.LOCAL
                    : MarketType.CROSS_BORDER,
                provider,
              },
            ),
          },
        },
        tx,
      );

      await this.paymentRepository.createEvent(
        {
          paymentId: createdPayment.id,
          eventType: PaymentEventType.PAYMENT_CREATED,
          payloadJson: {
            source: 'academy-enrollment',
            academyEnrollmentId: enrollment.id,
          },
        },
        tx,
      );

      const createdAttempt = await this.academyRepository.createPaymentAttempt(
        {
          academyCourseId: course.id,
          academyEnrollmentId: enrollment.id,
          paymentId: createdPayment.id,
          provider,
          status: PaymentStatus.CREATED,
          amountSubtotal: pricing.amount,
          amountDiscount: '0',
          amountTotal: pricing.amount,
          currencyCode: pricing.currencyCode,
        },
        tx,
      );
      paymentAttemptId = createdAttempt.id;

      await this.academyRepository.updateEnrollment(
        enrollment.id,
        {
          paymentId: createdPayment.id,
          enrollmentStatus: AcademyEnrollmentStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.CREATED,
          confirmedAt: null,
          cancelledAt: null,
          failedAt: null,
          failedReason: null,
        },
        tx,
      );

      return createdPayment;
    });

    const academyPaymentReturnUrl = this.resolveAcademyPaymentReturnUrl({
      locale: input.locale,
      enrollmentId: enrollment.id,
      publicAccessToken,
      returnUrlBase: input.payload.returnUrlBase ?? null,
    });

    try {
      const providerResult = await providerAdapter.initiateSessionPayment({
        paymentId: payment.id,
        amountMinor: this.toMinorUnits(pricing.amount),
        currency: pricing.currencyCode,
        description: `Academy enrollment payment: ${course.slug}`,
        sessionId: course.id,
        patientEmail: learner.email ?? null,
        redirectionUrl: academyPaymentReturnUrl,
      });

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
              source: 'academy-enrollment',
              checkoutUrl: providerResult.checkoutUrl ?? null,
              clientSecret: providerResult.clientSecret ?? null,
              academyEnrollmentId: enrollment.id,
              academyCourseId: course.id,
              learnerId: learner.id,
              countrySnapshot:
                this.paymentGeoContextService.buildCountrySnapshot({
                  declaredCountryCode: countryResolution.declaredCountryCode,
                  resolvedCountryCode: countryResolution.resolvedCountryCode,
                  countrySource: countryResolution.countrySource,
                  countryMismatch: countryResolution.countryMismatch,
                  phoneCountryCode: countryResolution.phoneCountryCode,
                  operatingCountryCode: null,
                  checkoutCountryCode: countryResolution.resolvedCountryCode,
                  pricingCurrencyCode: pricing.currencyCode,
                  pricingMarketType:
                    pricing.currencyCode === 'EGP'
                      ? MarketType.LOCAL
                      : MarketType.CROSS_BORDER,
                  provider,
                }),
              ...(providerResult.metadata ?? {}),
            },
          },
          tx,
        );

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

        if (paymentAttemptId) {
          await this.academyRepository.updatePaymentAttempt(
            paymentAttemptId,
            {
              status: updatedPayment.status,
              providerPaymentRef: this.normalizePaymentAttemptValue(
                providerResult.providerPaymentRef,
                191,
              ),
              providerOrderRef: this.normalizePaymentAttemptValue(
                providerResult.providerOrderRef ?? null,
                191,
              ),
              providerCustomerRef: this.normalizePaymentAttemptValue(
                providerResult.providerCustomerRef ?? null,
                191,
              ),
              checkoutUrl: this.normalizePaymentAttemptValue(
                providerResult.checkoutUrl ?? null,
                500,
              ),
              clientSecret: this.normalizePaymentAttemptValue(
                providerResult.clientSecret ?? null,
                500,
              ),
            },
            tx,
          );
        }

        await this.academyRepository.createActivityLog({
          academyCourseId: course.id,
          academyEnrollmentId: enrollment.id,
          action: 'PAYMENT_CHECKOUT_CREATED',
          note: `Payment checkout created with status ${updatedPayment.status}.`,
        });
      });
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await this.paymentRepository.updateStatus(
          payment.id,
          {
            status: PaymentStatus.FAILED,
            failedAt: new Date(),
          },
          tx,
        );

        if (paymentAttemptId) {
          await this.academyRepository.updatePaymentAttempt(
            paymentAttemptId,
            {
              status: PaymentStatus.FAILED,
              failureReason:
                error instanceof Error
                  ? error.message.slice(0, 500)
                  : 'Payment initiation failed',
            },
            tx,
          );
        }

        await this.academyRepository.updateEnrollment(
          enrollment.id,
          {
            enrollmentStatus: AcademyEnrollmentStatus.PAYMENT_FAILED,
            paymentStatus: PaymentStatus.FAILED,
            failedAt: new Date(),
            failedReason:
              error instanceof Error
                ? error.message.slice(0, 500)
                : 'Payment initiation failed',
          },
          tx,
        );
      });

      throw error;
    }

    const refreshed = await this.academyRepository.findEnrollmentByIdForAdmin(
      enrollment.id,
    );
    if (!refreshed) {
      throw new NotFoundException({
        messageKey: 'academy.errors.enrollmentNotFound',
        error: 'ACADEMY_ENROLLMENT_NOT_FOUND',
      });
    }

    return {
      item: this.academyPresenter.presentEnrollmentItem(refreshed),
    };
  }

  private resolveProvider(input: {
    currencyCode: string;
    learnerCountryIsoCode: string | null;
  }) {
    const provider = resolveProviderForCurrency(input.currencyCode);
    if (provider === PaymentProvider.PAYMOB) {
      const normalizedCurrencyCode = input.currencyCode.trim().toUpperCase();

      if (normalizedCurrencyCode === 'USD') {
        return this.paymentProviderResolverService.resolveProvider({
          currencyCode: 'USD',
          commissionMarketType: MarketType.CROSS_BORDER,
          operatingCountryIsoCode: null,
          checkoutCountryIsoCode: input.learnerCountryIsoCode,
        });
      }

      return this.paymentProviderResolverService.resolveProvider({
        currencyCode: 'EGP',
        commissionMarketType: MarketType.LOCAL,
        operatingCountryIsoCode: input.learnerCountryIsoCode,
        checkoutCountryIsoCode: input.learnerCountryIsoCode,
      });
    }

    throw new BadRequestException({
      messageKey: 'academy.errors.unsupportedCurrency',
      error: 'ACADEMY_UNSUPPORTED_CURRENCY',
      messageParams: {
        currencyCode: input.currencyCode,
      },
    });
  }

  private resolveAcademyPaymentReturnUrl(input: {
    locale: SupportedLocale;
    enrollmentId: string;
    publicAccessToken: string;
    returnUrlBase?: string | null;
  }): string {
    const normalizedPath = `/${input.locale}/patient/academy/enrollments/${input.enrollmentId}/payment-return`;
    const returnUrlBase = this.resolveAllowedReturnUrlBase(
      input.returnUrlBase ?? null,
    );
    const normalizedBaseUrl = returnUrlBase
      ? returnUrlBase.endsWith('/')
        ? returnUrlBase
        : `${returnUrlBase}/`
      : (() => {
          const baseUrl = this.paymentRuntimeConfigService
            .getAppBaseUrl()
            .trim();
          return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        })();
    const returnUrl = new URL(
      input.returnUrlBase
        ? `${input.enrollmentId}/payment-return`
        : normalizedPath,
      normalizedBaseUrl,
    );
    returnUrl.searchParams.set('token', input.publicAccessToken);
    return returnUrl.toString();
  }

  private resolveAllowedReturnUrlBase(
    returnUrlBase: string | null | undefined,
  ): string | null {
    return this.paymentRuntimeConfigService.resolveTrustedReturnUrlBase(
      returnUrlBase ?? null,
    );
  }

  private toMinorUnits(amount: string): number {
    return Math.round(Number(amount) * 100);
  }

  private normalizePaymentAttemptValue(
    value: string | null | undefined,
    maxLength: number,
  ): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }

    return normalized.slice(0, maxLength);
  }

  private async upsertLearnerSafely(input: {
    fullName: string;
    phoneNumber: string;
    whatsappNumber?: string | null;
    email?: string | null;
    countryCode?: string | null;
    countryCodeDeclared?: string | null;
    countryCodeSource?: string | null;
    countryCodeMismatch?: boolean;
    sourceLabel?: string | null;
  }) {
    try {
      return await this.academyRepository.upsertLearner(input);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({
          messageKey: 'academy.errors.learnerContactAlreadyExists',
          error: 'ACADEMY_LEARNER_CONTACT_ALREADY_EXISTS',
        });
      }

      throw error;
    }
  }

  private async createEnrollmentSafely(input: {
    academyCourseId: string;
    academyLearnerId: string;
    publicAccessToken: string;
    enrollmentStatus: AcademyEnrollmentStatus;
    paymentStatus: PaymentStatus;
    confirmedAt?: Date | null;
    cancelledAt?: Date | null;
    failedAt?: Date | null;
    failedReason?: string | null;
  }) {
    try {
      return await this.academyRepository.createEnrollment(input);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const existing =
          await this.academyRepository.findEnrollmentByCourseAndLearner(
            input.academyCourseId,
            input.academyLearnerId,
          );
        if (existing) {
          return existing;
        }

        throw new ConflictException({
          messageKey: 'academy.errors.enrollmentAlreadyExists',
          error: 'ACADEMY_ENROLLMENT_ALREADY_EXISTS',
        });
      }

      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (error as { code?: string } | null | undefined)?.code === 'P2002';
  }
}

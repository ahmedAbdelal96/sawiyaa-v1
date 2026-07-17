import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AcademyProgramEnrollmentStatus,
  MarketType,
  PaymentEventType,
  PaymentPurpose,
  PaymentProvider,
  PaymentStatus,
  UserStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { resolveProviderForCurrency } from '@common/payments/payment-region.resolver';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import { PaymentGeoContextService } from '@modules/payments/services/payment-geo-context.service';
import { PaymentProviderRegistryService } from '@modules/payments/services/payment-provider-registry.service';
import { PaymentProviderResolverService } from '@modules/payments/services/payment-provider-resolver.service';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { ValidatePaymentStatusTransitionService } from '@modules/payments/services/validate-payment-status-transition.service';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { AcademyLearnerResolverService } from '../../services/academy-learner-resolver.service';
import { CreateAcademyProgramEnrollmentDto } from '../dto/create-academy-program-enrollment.dto';
import { AcademyProgramEnrollmentPresenter } from '../presenters/academy-program-enrollment.presenter';
import { AcademyProgramRepository } from '../repositories/academy-program.repository';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { AcademyProgramTargetLearnerAlertService } from '../services/academy-program-target-learner-alert.service';
import { resolveAcademyCheckoutPricing } from '../../utils/academy-pricing.util';

@Injectable()
export class CreateAcademyProgramEnrollmentUseCase {
  private readonly paymentReservationMinutes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly academyProgramRepository: AcademyProgramRepository,
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGeoContextService: PaymentGeoContextService,
    private readonly paymentProviderResolverService: PaymentProviderResolverService,
    private readonly paymentProviderRegistryService: PaymentProviderRegistryService,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
    private readonly academyLearnerResolverService: AcademyLearnerResolverService,
    private readonly academyProgramEnrollmentPresenter: AcademyProgramEnrollmentPresenter,
    private readonly academyProgramTargetLearnerAlertService: AcademyProgramTargetLearnerAlertService,
  ) {
    this.paymentReservationMinutes = this.configService.get<number>(
      'session.paymentReservationMinutes',
      15,
    );
  }

  async execute(input: {
    slug: string;
    locale: SupportedLocale;
    currentUser: AuthenticatedUser | null;
    payload: CreateAcademyProgramEnrollmentDto;
  }) {
    const program = await this.academyProgramRepository.findPublicProgramBySlug(
      input.slug,
    );
    if (!program) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.notFound',
        error: 'ACADEMY_PROGRAM_NOT_FOUND',
      });
    }

    if (!program.registrationOpen) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.registrationClosed',
        error: 'ACADEMY_PROGRAM_REGISTRATION_CLOSED',
      });
    }

    const { learner, countryResolution } =
      await this.academyLearnerResolverService.resolve({
        currentUser: input.currentUser,
        payload: input.payload,
      });

    const existing =
      await this.academyProgramEnrollmentRepository.findEnrollmentByProgramAndLearner(
        program.id,
        learner.id,
      );

    if (
      existing &&
      existing.status === AcademyProgramEnrollmentStatus.CONFIRMED
    ) {
      return {
        item: this.academyProgramEnrollmentPresenter.presentEnrollmentItem(
          existing,
          input.locale,
        ),
      };
    }

    const previousActiveLearnerCount = !existing
      ? await this.academyProgramEnrollmentRepository.countActiveLearnersByProgramId(
          program.id,
          new Date(),
        )
      : null;

    const pricing = resolveAcademyCheckoutPricing({
      priceAmountEgp: program.priceEgp,
      priceAmountUsd: program.priceUsd,
      priceAmount: null,
      currencyCode: null,
      resolvedCountryCode: countryResolution.resolvedCountryCode,
    });

    if (!pricing.amount || !pricing.currencyCode) {
      throw new BadRequestException({
        messageKey: 'academyProgram.errors.missingPricing',
        error: 'ACADEMY_PROGRAM_MISSING_PRICING',
      });
    }

    const publicAccessToken = randomUUID();
    const isFree =
      program.priceEgp?.toString() === '0' &&
      program.priceUsd?.toString() === '0';
    const now = new Date();
    const seatReservationExpiresAt = new Date(
      Date.now() + this.paymentReservationMinutes * 60 * 1000,
    );

    const guestUserId =
      !input.currentUser && !existing
        ? (
            await this.prisma.user.create({
              data: {
                displayName: input.payload.fullName.trim(),
                status: UserStatus.PENDING_VERIFICATION,
                defaultLocale: input.locale,
              },
              select: { id: true },
            })
          ).id
        : null;

    const enrollment =
      existing ??
      (await this.createEnrollmentSafely({
        academyProgramId: program.id,
        academyLearnerId: learner.id,
        publicAccessToken,
        status: isFree
          ? AcademyProgramEnrollmentStatus.CONFIRMED
          : AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
        paymentStatus: isFree ? PaymentStatus.CAPTURED : PaymentStatus.CREATED,
        registeredAt: now,
        lockedAt: isFree ? now : null,
        seatReservedAt: isFree ? now : now,
        seatReservationExpiresAt: isFree ? null : seatReservationExpiresAt,
        confirmedAt: isFree ? now : null,
        cancelledAt: null,
        expiredAt: null,
        selectedCurrencyCode: pricing.currencyCode,
        selectedAmountSnapshot: pricing.amount,
        submittedCountry: countryResolution.declaredCountryCode,
        lockedCountry: countryResolution.resolvedCountryCode,
        lockedCountrySource: countryResolution.countrySource,
        contactFullName: input.payload.fullName.trim(),
        contactEmail: input.payload.email?.trim() || null,
        contactPhone: input.payload.phoneNumber.trim(),
        contactWhatsapp: input.payload.whatsappNumber?.trim() || null,
        contactCountry: countryResolution.resolvedCountryCode,
        contactNotes: input.payload.sourceLabel?.trim() || null,
        userId: input.currentUser?.id ?? guestUserId,
      }));

    if (isFree) {
      if (previousActiveLearnerCount !== null) {
        const currentActiveLearnerCount =
          await this.academyProgramEnrollmentRepository.countActiveLearnersByProgramId(
            program.id,
            new Date(),
          );
        await this.academyProgramTargetLearnerAlertService.notifyIfTargetExceeded({
          program,
          previousActiveLearnerCount,
          currentActiveLearnerCount,
        });
      }

      return {
        item: this.academyProgramEnrollmentPresenter.presentEnrollmentItem(
          enrollment,
          input.locale,
        ),
      };
    }

    const provider = this.resolveProvider({
      currencyCode: pricing.currencyCode,
      learnerCountryIsoCode: learner.countryCode ?? null,
    });
    const providerAdapter = this.paymentProviderRegistryService.get(provider);

    let paymentAttemptId: string | null = null;

    const payment = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await this.paymentRepository.createPayment(
        {
          sessionId: null,
          patientId: null,
          practitionerId: null,
          paymentPurpose: PaymentPurpose.ACADEMY_PROGRAM_ENROLLMENT,
          provider,
          status: PaymentStatus.CREATED,
          amountSubtotal: pricing.amount,
          amountDiscount: '0',
          amountTotal: pricing.amount,
          currencyCode: pricing.currencyCode,
          metadataJson: {
            source: 'academy-program-enrollment',
            academyProgramId: program.id,
            academyProgramEnrollmentId: enrollment.id,
            learnerId: learner.id,
            countrySnapshot: this.paymentGeoContextService.buildCountrySnapshot({
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
          },
        },
        tx,
      );

      await this.paymentRepository.createEvent(
        {
          paymentId: createdPayment.id,
          eventType: PaymentEventType.PAYMENT_CREATED,
          payloadJson: {
            source: 'academy-program-enrollment',
            academyProgramEnrollmentId: enrollment.id,
          },
        },
        tx,
      );

      const createdAttempt =
        await this.academyProgramEnrollmentRepository.createPaymentAttempt(
          {
            academyProgramId: program.id,
            academyProgramEnrollmentId: enrollment.id,
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

      await this.academyProgramEnrollmentRepository.updateEnrollment(
        enrollment.id,
        {
          paymentId: createdPayment.id,
          status: AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.CREATED,
          confirmedAt: null,
          cancelledAt: null,
          expiredAt: null,
          lockedAt: null,
          seatReservedAt: now,
          seatReservationExpiresAt,
        },
        tx,
      );

      return createdPayment;
    });

    const academyProgramPaymentReturnUrl = this.resolvePaymentReturnUrl({
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
        description: `Academy program enrollment payment: ${program.slug}`,
        sessionId: program.id,
        patientEmail: learner.email ?? null,
        redirectionUrl: academyProgramPaymentReturnUrl,
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
              source: 'academy-program-enrollment',
              checkoutUrl: providerResult.checkoutUrl ?? null,
              clientSecret: providerResult.clientSecret ?? null,
              academyProgramEnrollmentId: enrollment.id,
              academyProgramId: program.id,
              learnerId: learner.id,
              countrySnapshot: this.paymentGeoContextService.buildCountrySnapshot({
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
          await this.academyProgramEnrollmentRepository.updatePaymentAttempt(
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
          await this.academyProgramEnrollmentRepository.updatePaymentAttempt(
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

        await this.academyProgramEnrollmentRepository.updateEnrollment(
          enrollment.id,
          {
            status: AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
            paymentStatus: PaymentStatus.FAILED,
            seatReservationExpiresAt: new Date(),
          },
          tx,
        );
      });

      if (previousActiveLearnerCount !== null) {
        const currentActiveLearnerCount =
          await this.academyProgramEnrollmentRepository.countActiveLearnersByProgramId(
            program.id,
            new Date(),
          );
        await this.academyProgramTargetLearnerAlertService.notifyIfTargetExceeded({
          program,
          previousActiveLearnerCount,
          currentActiveLearnerCount,
        });
      }

      throw error;
    }

    const refreshed =
      await this.academyProgramEnrollmentRepository.findEnrollmentByIdForAdmin(
        enrollment.id,
      );
    if (!refreshed) {
      throw new NotFoundException({
        messageKey: 'academyProgram.errors.enrollmentNotFound',
        error: 'ACADEMY_PROGRAM_ENROLLMENT_NOT_FOUND',
      });
    }

    return {
      item: this.academyProgramEnrollmentPresenter.presentEnrollmentItem(
        refreshed,
        input.locale,
      ),
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
      messageKey: 'academyProgram.errors.unsupportedCurrency',
      error: 'ACADEMY_PROGRAM_UNSUPPORTED_CURRENCY',
      messageParams: {
        currencyCode: input.currencyCode,
      },
    });
  }

  private resolvePaymentReturnUrl(input: {
    locale: SupportedLocale;
    enrollmentId: string;
    publicAccessToken: string;
    returnUrlBase?: string | null;
  }): string {
    const normalizedPath = `/${input.locale}/patient/academy/program-enrollments/${input.enrollmentId}/payment-return`;
    const returnUrlBase = this.paymentRuntimeConfigService.resolveTrustedReturnUrlBase(
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

  private async createEnrollmentSafely(input: {
    academyProgramId: string;
    academyLearnerId: string;
    publicAccessToken: string;
    status: AcademyProgramEnrollmentStatus;
    paymentStatus: PaymentStatus;
    registeredAt: Date;
    lockedAt: Date | null;
    seatReservedAt: Date | null;
    seatReservationExpiresAt: Date | null;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
    expiredAt: Date | null;
    selectedCurrencyCode: string;
    selectedAmountSnapshot: string;
    submittedCountry: string | null;
    lockedCountry: string | null;
    lockedCountrySource: string | null;
    contactFullName: string;
    contactEmail: string | null;
    contactPhone: string;
    contactWhatsapp: string | null;
    contactCountry: string | null;
    contactNotes: string | null;
    userId: string | null;
  }) {
    try {
      return await this.academyProgramEnrollmentRepository.createEnrollment(
        input,
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const existing =
          await this.academyProgramEnrollmentRepository.findEnrollmentByProgramAndLearner(
            input.academyProgramId,
            input.academyLearnerId,
          );
        if (existing) {
          return existing;
        }

        throw new ConflictException({
          messageKey: 'academyProgram.errors.enrollmentAlreadyExists',
          error: 'ACADEMY_PROGRAM_ENROLLMENT_ALREADY_EXISTS',
        });
      }

      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (error as { code?: string } | null | undefined)?.code === 'P2002';
  }
}

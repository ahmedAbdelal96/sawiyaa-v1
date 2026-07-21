import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { toGatewayMinorUnits } from '@modules/payments/utils/money-units.util';
import { PaymentRepository } from '@modules/payments/repositories/payment.repository';
import {
  PaymentEventType,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  AcademyProgramEnrollmentStatus,
} from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { PaymentProviderRegistryService } from '@modules/payments/services/payment-provider-registry.service';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { ValidatePaymentStatusTransitionService } from '@modules/payments/services/validate-payment-status-transition.service';

type RedirectStatus = 'succeeded' | 'payment_expired' | 'payment_unavailable';

@Injectable()
export class GetPublicAcademyProgramEnrollmentPaymentRedirectUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProviderRegistryService: PaymentProviderRegistryService,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
  ) {}

  async execute(input: {
    enrollmentId: string;
    token: string;
    locale: SupportedLocale;
    returnUrl?: string | null;
    callerSurfaceUrl?: string | null;
  }) {
    const enrollment =
      await this.academyProgramEnrollmentRepository.findEnrollmentByIdForPublic(
        input.enrollmentId,
        input.token,
      );

    const fallbackReturnUrl = this.buildFallbackReturnUrl({
      enrollmentId: input.enrollmentId,
      token: input.token,
      locale: input.locale,
      callerSurfaceUrl: input.callerSurfaceUrl ?? null,
    });
    const safeReturnUrl = this.resolveAllowedReturnUrl(
      input.returnUrl ?? null,
      fallbackReturnUrl,
    );

    if (!enrollment) {
      return {
        redirectUrl: this.appendRedirectStatus(
          safeReturnUrl,
          'payment_unavailable',
        ),
      };
    }

    if (
      enrollment.status === AcademyProgramEnrollmentStatus.CONFIRMED ||
      enrollment.paymentStatus === PaymentStatus.CAPTURED
    ) {
      return {
        redirectUrl: this.appendRedirectStatus(safeReturnUrl, 'succeeded'),
      };
    }

    if (
      enrollment.status === AcademyProgramEnrollmentStatus.CANCELLED ||
      enrollment.status === AcademyProgramEnrollmentStatus.EXPIRED
    ) {
      return {
        redirectUrl: this.appendRedirectStatus(
          safeReturnUrl,
          'payment_unavailable',
        ),
      };
    }

    const currentPayment =
      enrollment.payment ?? enrollment.paymentAttempts?.[0] ?? null;

    if (!currentPayment) {
      return {
        redirectUrl: this.appendRedirectStatus(
          safeReturnUrl,
          'payment_unavailable',
        ),
      };
    }

    if (
      currentPayment.status === PaymentStatus.AUTHORIZED ||
      currentPayment.status === PaymentStatus.CAPTURED
    ) {
      return {
        redirectUrl: this.appendRedirectStatus(safeReturnUrl, 'succeeded'),
      };
    }

    let paymentId: string | null = null;
    let paymentAttemptId: string | null = null;

    try {
      const createdPayment = await this.prisma.$transaction(async (tx) => {
        const payment = await this.paymentRepository.createPayment(
          {
            sessionId: null,
            patientId: null,
            practitionerId: null,
            paymentPurpose: PaymentPurpose.ACADEMY_PROGRAM_ENROLLMENT,
            provider: currentPayment.provider,
            status: PaymentStatus.CREATED,
            amountSubtotal: new Prisma.Decimal(
              currentPayment.amountSubtotal.toString(),
            ),
            amountDiscount: new Prisma.Decimal(
              currentPayment.amountDiscount.toString(),
            ),
            amountTotal: new Prisma.Decimal(
              currentPayment.amountTotal.toString(),
            ),
            amountFromWallet: new Prisma.Decimal(0),
            amountFromGateway: new Prisma.Decimal(
              currentPayment.amountTotal.toString(),
            ),
            currencyCode: currentPayment.currencyCode,
            metadataJson: {
              source: 'academy-program-enrollment',
              academyProgramId: enrollment.academyProgram.id,
              academyProgramEnrollmentId: enrollment.id,
              learnerId: enrollment.academyLearner.id,
            },
          },
          tx,
        );

        const attempt =
          await this.academyProgramEnrollmentRepository.createPaymentAttempt(
            {
              academyProgramId: enrollment.academyProgram.id,
              academyProgramEnrollmentId: enrollment.id,
              paymentId: payment.id,
              provider: currentPayment.provider,
              status: PaymentStatus.CREATED,
              amountSubtotal: new Prisma.Decimal(
                currentPayment.amountSubtotal.toString(),
              ),
              amountDiscount: new Prisma.Decimal(
                currentPayment.amountDiscount.toString(),
              ),
              amountTotal: new Prisma.Decimal(
                currentPayment.amountTotal.toString(),
              ),
              currencyCode: currentPayment.currencyCode,
            },
            tx,
          );

        await this.academyProgramEnrollmentRepository.updateEnrollment(
          enrollment.id,
          {
            paymentId: payment.id,
            status: AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
            paymentStatus: PaymentStatus.CREATED,
            confirmedAt: null,
            cancelledAt: null,
            expiredAt: null,
            seatReservationExpiresAt: new Date(
              Date.now() + 15 * 60 * 1000,
            ),
          },
          tx,
        );

        paymentId = payment.id;
        paymentAttemptId = attempt.id;

        return payment;
      });

      const providerAdapter = this.paymentProviderRegistryService.get(
        currentPayment.provider,
        {
          checkoutCountryIsoCode:
            enrollment.academyLearner.countryCode ?? null,
          operatingCountryIsoCode:
            enrollment.academyLearner.countryCode ?? null,
        },
      );

      const providerResult = await providerAdapter.initiateSessionPayment({
        paymentId: createdPayment.id,
        amountMinor: toGatewayMinorUnits(createdPayment.amountTotal, createdPayment.currencyCode),
        currency: createdPayment.currencyCode,
        description: `Academy program enrollment payment: ${enrollment.academyProgram.slug}`,
        sessionId: enrollment.academyProgram.id,
        patientEmail: enrollment.academyLearner.email ?? null,
        redirectionUrl: safeReturnUrl,
      });

      const checkoutUrl = providerResult.checkoutUrl?.trim() ?? '';
      if (!checkoutUrl) {
        throw new ServiceUnavailableException({
          messageKey: 'payments.errors.providerInitializationFailed',
          error: 'PAYMENT_PROVIDER_INITIALIZATION_FAILED',
        });
      }

      this.validatePaymentStatusTransitionService.assertCanTransition(
        createdPayment.status,
        providerResult.status,
      );

      await this.prisma.$transaction(async (tx) => {
        const updatedPayment = await this.paymentRepository.updateStatus(
          createdPayment.id,
          {
            status: providerResult.status,
            providerPaymentRef: providerResult.providerPaymentRef,
            providerOrderRef: providerResult.providerOrderRef ?? null,
            providerCustomerRef: providerResult.providerCustomerRef ?? null,
            metadataJson: {
              ...(createdPayment.metadataJson as Record<string, unknown>),
              source: 'academy-program-enrollment',
              checkoutUrl,
              clientSecret: providerResult.clientSecret ?? null,
              academyProgramEnrollmentId: enrollment.id,
              academyProgramId: enrollment.academyProgram.id,
              learnerId: enrollment.academyLearner.id,
              ...(providerResult.metadata ?? {}),
            },
          },
          tx,
        );

        await this.paymentRepository.createEvent(
          {
            paymentId: createdPayment.id,
            eventType: PaymentEventType.PROVIDER_CHECKOUT_CREATED,
            providerEventRef: providerResult.providerPaymentRef,
            payloadJson: {
              provider: currentPayment.provider,
              checkoutUrl,
              clientSecret: providerResult.clientSecret ? 'present' : null,
              source: 'academy-program-enrollment-payment-redirect',
            },
          },
          tx,
        );

        if (paymentAttemptId) {
          await this.academyProgramEnrollmentRepository.updatePaymentAttempt(
            paymentAttemptId,
            {
              status: updatedPayment.status,
              providerPaymentRef: this.normalizeValue(
                providerResult.providerPaymentRef,
                191,
              ),
              providerOrderRef: this.normalizeValue(
                providerResult.providerOrderRef ?? null,
                191,
              ),
              providerCustomerRef: this.normalizeValue(
                providerResult.providerCustomerRef ?? null,
                191,
              ),
              checkoutUrl: this.normalizeValue(checkoutUrl, 500),
              clientSecret: this.normalizeValue(
                providerResult.clientSecret ?? null,
                500,
              ),
            },
            tx,
          );
        }
      });

      return {
        redirectUrl: checkoutUrl,
      };
    } catch (error) {
      if (paymentId) {
        try {
          await this.prisma.$transaction(async (tx) => {
            await this.paymentRepository.updateStatus(
              paymentId!,
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
        } catch {
          // keep the redirect safe even if the bookkeeping fails
        }
      }

      return {
        redirectUrl: this.appendRedirectStatus(
          safeReturnUrl,
          this.resolveFailureRedirectStatus(error),
        ),
      };
    }
  }

  private resolveFailureRedirectStatus(error: unknown): RedirectStatus {
    if (error instanceof BadRequestException) {
      return 'payment_unavailable';
    }

    if (error instanceof ServiceUnavailableException) {
      return 'payment_unavailable';
    }

    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (
      message.includes('expired') ||
      message.includes('invalid or expired') ||
      message.includes('signature')
    ) {
      return 'payment_expired';
    }

    return 'payment_unavailable';
  }

  private buildFallbackReturnUrl(input: {
    enrollmentId: string;
    token: string;
    locale: SupportedLocale;
    callerSurfaceUrl?: string | null;
  }): string {
    const trustedBaseUrl = this.resolveTrustedReturnBaseUrl(
      input.callerSurfaceUrl ?? null,
    );
    const returnUrl = trustedBaseUrl
      ? this.buildReturnUrlForTrustedBase({
          trustedBaseUrl,
          enrollmentId: input.enrollmentId,
          locale: input.locale,
        })
      : this.buildAppFallbackReturnUrl({
          enrollmentId: input.enrollmentId,
          token: input.token,
          locale: input.locale,
        });
    returnUrl.searchParams.set('token', input.token);
    return returnUrl.toString();
  }

  private resolveAllowedReturnUrl(
    returnUrl: string | null | undefined,
    fallbackReturnUrl: string,
  ): string {
    const trustedReturnUrl =
      this.paymentRuntimeConfigService.resolveTrustedReturnUrl(
        returnUrl ?? null,
      );

    if (trustedReturnUrl) {
      return trustedReturnUrl;
    }

    return fallbackReturnUrl;
  }

  private resolveTrustedReturnBaseUrl(
    callerSurfaceUrl: string | null,
  ): string | null {
    if (!callerSurfaceUrl?.trim()) {
      return null;
    }

    try {
      const parsed = new URL(callerSurfaceUrl.trim());

      if (parsed.protocol === 'sawiyaa:') {
        return parsed.toString();
      }

      if (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        this.paymentRuntimeConfigService
          .getTrustedReturnUrlOrigins()
          .includes(parsed.origin)
      ) {
        return parsed.origin;
      }
    } catch {
      return null;
    }

    return null;
  }

  private buildAppFallbackReturnUrl(input: {
    enrollmentId: string;
    token: string;
    locale: SupportedLocale;
  }): URL {
    const appBaseUrl = this.getAppBaseUrlOrNull();
    return appBaseUrl
      ? new URL(
          `/${input.locale}/patient/academy/program-enrollments/${input.enrollmentId}/payment-return`,
          appBaseUrl.endsWith('/') ? appBaseUrl : `${appBaseUrl}/`,
        )
      : new URL(
          `sawiyaa://academy/program-enrollments/${input.enrollmentId}/payment-return`,
        );
  }

  private buildReturnUrlForTrustedBase(input: {
    trustedBaseUrl: string;
    enrollmentId: string;
    locale: SupportedLocale;
  }): URL {
    const baseUrl = input.trustedBaseUrl.endsWith('/')
      ? input.trustedBaseUrl
      : `${input.trustedBaseUrl}/`;

    if (baseUrl.startsWith('sawiyaa://')) {
      return new URL(
        `academy/program-enrollments/${input.enrollmentId}/payment-return`,
        baseUrl,
      );
    }

    return new URL(
      `/${input.locale}/patient/academy/program-enrollments/${input.enrollmentId}/payment-return`,
      baseUrl,
    );
  }

  private getAppBaseUrlOrNull(): string | null {
    try {
      const appBaseUrl = this.paymentRuntimeConfigService
        .getAppBaseUrl()
        .trim();
      return appBaseUrl || null;
    } catch {
      return null;
    }
  }

  private appendRedirectStatus(returnUrl: string, status: string): string {
    const parsed = new URL(returnUrl);
    parsed.searchParams.set('redirect_status', status);
    return parsed.toString();
  }

  private normalizeValue(
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

}

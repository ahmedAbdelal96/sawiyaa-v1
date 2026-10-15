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
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  AcademyProgramEnrollmentStatus,
} from '@prisma/client';
import { resolveProviderForCurrency } from '@common/payments/payment-region.resolver';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { AcademyProgramEnrollmentRepository } from '../repositories/academy-program-enrollment.repository';
import { PaymentProviderRegistryService } from '@modules/payments/services/payment-provider-registry.service';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { ValidatePaymentStatusTransitionService } from '@modules/payments/services/validate-payment-status-transition.service';

type RedirectStatus = 'succeeded' | 'payment_expired' | 'payment_unavailable';

@Injectable()
export class GetPatientAcademyProgramEnrollmentPaymentRedirectUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academyProgramEnrollmentRepository: AcademyProgramEnrollmentRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentProviderRegistryService: PaymentProviderRegistryService,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
    private readonly validatePaymentStatusTransitionService: ValidatePaymentStatusTransitionService,
  ) {}

  async execute(input: {
    userId: string;
    enrollmentId: string;
    locale: SupportedLocale;
    returnUrl?: string | null;
    callerSurfaceUrl?: string | null;
  }) {
    const enrollment =
      await this.academyProgramEnrollmentRepository.findEnrollmentByIdForUser(
        input.enrollmentId,
        input.userId,
      );

    const fallbackReturnUrl = this.buildFallbackReturnUrl({
      enrollmentId: input.enrollmentId,
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

    const now = new Date();
    if (
      enrollment.seatReservationExpiresAt &&
      enrollment.seatReservationExpiresAt <= now
    ) {
      return {
        redirectUrl: this.appendRedirectStatus(safeReturnUrl, 'payment_expired'),
      };
    }

    let targetPayment = enrollment.payment ?? null;
    let paymentAttemptId: string | null = null;
    let gatewayProvider: PaymentProvider | null = null;

    if (targetPayment) {
      if (
        targetPayment.status === PaymentStatus.AUTHORIZED ||
        targetPayment.status === PaymentStatus.CAPTURED
      ) {
        return {
          redirectUrl: this.appendRedirectStatus(safeReturnUrl, 'succeeded'),
        };
      }

      if (targetPayment.provider === PaymentProvider.MANUAL) {
        return {
          redirectUrl: this.appendRedirectStatus(
            safeReturnUrl,
            'payment_unavailable',
          ),
        };
      }

      gatewayProvider = targetPayment.provider;
      const metadata = (targetPayment.metadataJson ?? {}) as Record<string, unknown>;
      const existingCheckoutUrl =
        typeof metadata.checkoutUrl === 'string' && metadata.checkoutUrl.trim().length > 0
          ? metadata.checkoutUrl.trim()
          : (enrollment.paymentAttempts?.[0]?.checkoutUrl ?? null);

      if (
        existingCheckoutUrl &&
        targetPayment.status !== PaymentStatus.FAILED &&
        targetPayment.status !== PaymentStatus.EXPIRED &&
        targetPayment.status !== PaymentStatus.CANCELLED
      ) {
        return { redirectUrl: existingCheckoutUrl };
      }

      paymentAttemptId = enrollment.paymentAttempts?.[0]?.id ?? null;
    }

    if (!targetPayment) {
      const resolvedProvider = resolveProviderForCurrency(
        enrollment.selectedCurrencyCode,
      );
      if (!resolvedProvider) {
        return {
          redirectUrl: this.appendRedirectStatus(
            safeReturnUrl,
            'payment_unavailable',
          ),
        };
      }
      gatewayProvider = resolvedProvider;

      try {
        const createResult = await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT id FROM "AcademyProgramEnrollment" WHERE id = ${enrollment.id}::uuid FOR UPDATE`;

          const lockedEnrollment =
            await tx.academyProgramEnrollment.findUnique({
              where: { id: enrollment.id },
              include: {
                academyProgram: true,
                academyLearner: true,
                payment: true,
                paymentAttempts: { orderBy: { createdAt: 'desc' }, take: 1 },
              },
            });

          if (!lockedEnrollment) {
            throw new Error('ENROLLMENT_NOT_FOUND');
          }

          if (
            lockedEnrollment.status !==
              AcademyProgramEnrollmentStatus.PENDING_PAYMENT ||
            (lockedEnrollment.seatReservationExpiresAt &&
              lockedEnrollment.seatReservationExpiresAt <= new Date())
          ) {
            throw new Error('ENROLLMENT_RESERVATION_EXPIRED');
          }

          if (lockedEnrollment.paymentId && lockedEnrollment.payment) {
            if (lockedEnrollment.payment.provider === PaymentProvider.MANUAL) {
              throw new Error('ENROLLMENT_ALREADY_MANUAL');
            }
            return {
              payment: lockedEnrollment.payment,
              attemptId: lockedEnrollment.paymentAttempts[0]?.id ?? null,
            };
          }

          const amountTotal = lockedEnrollment.selectedAmountSnapshot;
          const currencyCode = lockedEnrollment.selectedCurrencyCode;

          const createdPayment = await this.paymentRepository.createPayment(
            {
              sessionId: null,
              patientId: null,
              practitionerId: null,
              paymentPurpose: PaymentPurpose.ACADEMY_PROGRAM_ENROLLMENT,
              provider: gatewayProvider!,
              status: PaymentStatus.CREATED,
              amountSubtotal: new Prisma.Decimal(amountTotal.toString()),
              amountDiscount: new Prisma.Decimal(0),
              amountTotal: new Prisma.Decimal(amountTotal.toString()),
              amountFromWallet: new Prisma.Decimal(0),
              amountFromGateway: new Prisma.Decimal(amountTotal.toString()),
              currencyCode,
              metadataJson: {
                source: 'academy-program-enrollment',
                academyProgramId: lockedEnrollment.academyProgram.id,
                academyProgramEnrollmentId: lockedEnrollment.id,
                learnerId: lockedEnrollment.academyLearner.id,
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
                academyProgramEnrollmentId: lockedEnrollment.id,
                provider: gatewayProvider!,
              },
            },
            tx,
          );

          const attempt =
            await this.academyProgramEnrollmentRepository.createPaymentAttempt(
              {
                academyProgramId: lockedEnrollment.academyProgram.id,
                academyProgramEnrollmentId: lockedEnrollment.id,
                paymentId: createdPayment.id,
                provider: gatewayProvider!,
                status: PaymentStatus.CREATED,
                amountSubtotal: new Prisma.Decimal(amountTotal.toString()),
                amountDiscount: new Prisma.Decimal(0),
                amountTotal: new Prisma.Decimal(amountTotal.toString()),
                currencyCode,
              },
              tx,
            );

          await this.academyProgramEnrollmentRepository.updateEnrollment(
            lockedEnrollment.id,
            {
              paymentId: createdPayment.id,
              status: AcademyProgramEnrollmentStatus.PENDING_PAYMENT,
              paymentStatus: PaymentStatus.CREATED,
              confirmedAt: null,
              cancelledAt: null,
              expiredAt: null,
            },
            tx,
          );

          return { payment: createdPayment, attemptId: attempt.id };
        });

        targetPayment = createResult.payment;
        paymentAttemptId = createResult.attemptId;
      } catch (err: any) {
        if (err?.message === 'ENROLLMENT_RESERVATION_EXPIRED') {
          return {
            redirectUrl: this.appendRedirectStatus(
              safeReturnUrl,
              'payment_expired',
            ),
          };
        }
        return {
          redirectUrl: this.appendRedirectStatus(
            safeReturnUrl,
            'payment_unavailable',
          ),
        };
      }
    }

    const paymentId = targetPayment.id;

    try {
      const providerAdapter = this.paymentProviderRegistryService.get(
        gatewayProvider!,
        {
          checkoutCountryIsoCode:
            enrollment.academyLearner.countryCode ?? null,
          operatingCountryIsoCode:
            enrollment.academyLearner.countryCode ?? null,
        },
      );

      const providerResult = await providerAdapter.initiateSessionPayment({
        paymentId: targetPayment.id,
        amountMinor: toGatewayMinorUnits(targetPayment.amountTotal, targetPayment.currencyCode),
        currency: targetPayment.currencyCode,
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
        targetPayment.status,
        providerResult.status,
      );

      await this.prisma.$transaction(async (tx) => {
        const updatedPayment = await this.paymentRepository.updateStatus(
          targetPayment!.id,
          {
            status: providerResult.status,
            providerPaymentRef: providerResult.providerPaymentRef,
            providerOrderRef: providerResult.providerOrderRef ?? null,
            providerCustomerRef: providerResult.providerCustomerRef ?? null,
            metadataJson: {
              ...((targetPayment!.metadataJson as Record<string, unknown>) ?? {}),
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
            paymentId: targetPayment!.id,
            eventType: PaymentEventType.PROVIDER_CHECKOUT_CREATED,
            providerEventRef: providerResult.providerPaymentRef,
            payloadJson: {
              provider: gatewayProvider!,
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
              failureReason: null,
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
          locale: input.locale,
        });

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
      const appBaseUrl = this.paymentRuntimeConfigService.getAppBaseUrl().trim();
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

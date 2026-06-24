import { Injectable } from '@nestjs/common';
import { EnrollmentStatus, PaymentStatus } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PaymentRuntimeConfigService } from '@modules/payments/services/payment-runtime-config.service';
import { TrainingRepository } from '../repositories/training.repository';
import { CreateTrainingEnrollmentUseCase } from './create-training-enrollment.use-case';

@Injectable()
export class GetPatientTrainingEnrollmentPaymentRedirectUseCase {
  constructor(
    private readonly trainingRepository: TrainingRepository,
    private readonly createTrainingEnrollmentUseCase: CreateTrainingEnrollmentUseCase,
    private readonly paymentRuntimeConfigService: PaymentRuntimeConfigService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    enrollmentId: string;
    returnUrl?: string | null;
    callerSurfaceUrl?: string | null;
  }) {
    const fallbackReturnUrl = this.buildFallbackReturnUrl({
      locale: input.locale,
      enrollmentId: input.enrollmentId,
      callerSurfaceUrl: input.callerSurfaceUrl ?? null,
    });
    const safeReturnUrl = this.resolveAllowedReturnUrl(
      input.returnUrl ?? null,
      fallbackReturnUrl,
    );

    const enrollment = await this.trainingRepository.findEnrollmentByIdForUser(
      input.enrollmentId,
      input.userId,
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
      enrollment.enrollmentStatus === EnrollmentStatus.ACTIVE ||
      enrollment.enrollmentStatus === EnrollmentStatus.COMPLETED
    ) {
      return {
        redirectUrl: this.appendRedirectStatus(safeReturnUrl, 'succeeded'),
      };
    }

    const currentPaymentStatus = enrollment.payment?.status ?? null;
    if (
      currentPaymentStatus === PaymentStatus.AUTHORIZED ||
      currentPaymentStatus === PaymentStatus.CAPTURED
    ) {
      return {
        redirectUrl: this.appendRedirectStatus(safeReturnUrl, 'succeeded'),
      };
    }

    if (enrollment.enrollmentStatus !== EnrollmentStatus.PENDING_PAYMENT) {
      return {
        redirectUrl: this.appendRedirectStatus(
          safeReturnUrl,
          'payment_unavailable',
        ),
      };
    }

    try {
      const refreshed = await this.createTrainingEnrollmentUseCase.execute({
        userId: input.userId,
        locale: input.locale,
        scheduleId: enrollment.courseScheduleId,
        payload: {
          returnUrl: safeReturnUrl,
          forceRefreshPayment: true,
        },
      });

      const checkoutUrl = refreshed.item.payment?.checkoutUrl?.trim() ?? null;
      if (!checkoutUrl) {
        return {
          redirectUrl: this.appendRedirectStatus(
            safeReturnUrl,
            'payment_unavailable',
          ),
        };
      }

      return { redirectUrl: checkoutUrl };
    } catch {
      return {
        redirectUrl: this.appendRedirectStatus(
          safeReturnUrl,
          'payment_unavailable',
        ),
      };
    }
  }

  private buildFallbackReturnUrl(input: {
    locale: SupportedLocale;
    enrollmentId: string;
    callerSurfaceUrl: string | null;
  }): string {
    const callerSurface = this.resolveSurfaceBaseUrl(input.callerSurfaceUrl);
    if (callerSurface) {
      return `${callerSurface}/${input.locale}/patient/training/${input.enrollmentId}/payment-return`;
    }

    const appBaseUrl = this.paymentRuntimeConfigService
      .getAppBaseUrl()
      .replace(/\/$/, '');
    return `${appBaseUrl}/${input.locale}/patient/training/${input.enrollmentId}/payment-return`;
  }

  private resolveSurfaceBaseUrl(value: string | null): string | null {
    if (!value?.trim()) {
      return null;
    }

    try {
      const parsed = new URL(value.trim());
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin;
      }

      if (parsed.protocol === 'sawiyaa:') {
        return parsed.toString().replace(/\/$/, '');
      }
    } catch {
      return null;
    }

    return null;
  }

  private resolveAllowedReturnUrl(
    returnUrl: string | null,
    fallbackReturnUrl: string,
  ): string {
    const trustedReturnUrl =
      this.paymentRuntimeConfigService.resolveTrustedReturnUrl(returnUrl);

    return trustedReturnUrl ?? fallbackReturnUrl;
  }

  private appendRedirectStatus(url: string, status: string): string {
    const parsed = new URL(url);
    parsed.searchParams.set('redirect_status', status);
    return parsed.toString();
  }
}

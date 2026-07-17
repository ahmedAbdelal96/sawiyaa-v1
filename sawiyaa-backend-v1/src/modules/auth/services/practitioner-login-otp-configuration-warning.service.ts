import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '@common/logging/app-logger.service';

/** Emits one operational warning when emergency password-only mode is active. */
@Injectable()
export class PractitionerLoginOtpConfigurationWarningService
  implements OnApplicationBootstrap
{
  private warned = false;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  onApplicationBootstrap(): void {
    if (
      this.warned ||
      this.config.get<boolean>('auth.practitionerLoginOtpRequired') !== false
    ) {
      return;
    }

    this.warned = true;
    this.logger.error(
      {
        message:
          'Practitioner login OTP enforcement is disabled by server configuration',
        event: 'PRACTITIONER_LOGIN_OTP_DISABLED',
        severity: 'critical',
        environment: this.config.get<string>('app.nodeEnv') ?? 'unknown',
        otpRequired: false,
      },
      undefined,
      'Authentication',
    );
  }
}

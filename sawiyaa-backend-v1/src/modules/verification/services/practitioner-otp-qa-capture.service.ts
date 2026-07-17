import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { appendFile, chmod, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * Development/test-only OTP capture for a protected local QA file.
 * This never exposes OTP values through an HTTP surface and is disabled by default.
 */
@Injectable()
export class PractitionerOtpQaCaptureService {
  private readonly enabled: boolean;
  private readonly capturePath: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled =
      this.configService.get<string>('app.nodeEnv') !== 'production' &&
      this.configService.get<boolean>('auth.practitionerOtpQaCaptureEnabled') ===
        true;
    this.capturePath = resolve(
      process.env.PRACTITIONER_OTP_QA_CAPTURE_PATH ??
        resolve(process.cwd(), '.tmp/practitioner-otp-qa.capture'),
    );

    if (
      this.configService.get<boolean>('auth.practitionerOtpQaCaptureEnabled') ===
        true &&
      this.configService.get<string>('app.nodeEnv') === 'production'
    ) {
      throw new Error(
        'PRACTITIONER_OTP_QA_CAPTURE_ENABLED must be disabled in production',
      );
    }
  }

  async capture(input: {
    code: string;
    expiresAt: Date;
    purpose: string;
  }): Promise<void> {
    if (!this.enabled) return;

    await mkdir(dirname(this.capturePath), { recursive: true, mode: 0o700 });
    await appendFile(
      this.capturePath,
      `${new Date().toISOString()} purpose=${input.purpose} code=${input.code} expiresAt=${input.expiresAt.toISOString()}\n`,
      { encoding: 'utf8', mode: 0o600 },
    );
    await chmod(this.capturePath, 0o600);
  }
}

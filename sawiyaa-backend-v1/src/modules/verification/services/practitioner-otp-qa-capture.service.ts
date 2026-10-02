import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { appendFile, chmod, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * Development/test-only OTP capture for a protected local QA file.
 * This never exposes OTP values through an HTTP surface and is disabled by default.
 */
@Injectable()
export class PractitionerOtpQaCaptureService {
  private readonly enabled: boolean;
  private readonly capturePath: string;
  private readonly allowedAccounts: Set<string>;

  constructor(private readonly configService: ConfigService) {
    this.enabled =
      this.configService.get<string>('app.nodeEnv') !== 'production' &&
      this.configService.get<boolean>(
        'auth.practitionerOtpQaCaptureEnabled',
      ) === true;
    this.capturePath = resolve(
      process.env.PRACTITIONER_OTP_QA_CAPTURE_PATH ??
        resolve(process.cwd(), '.tmp/practitioner-otp-qa.capture'),
    );
    this.allowedAccounts = new Set(
      this.configService.get<string[]>(
        'auth.practitionerOtpQaCaptureAccounts',
      ) ?? [],
    );

    if (
      this.configService.get<boolean>(
        'auth.practitionerOtpQaCaptureEnabled',
      ) === true &&
      this.configService.get<string>('app.nodeEnv') === 'production'
    ) {
      throw new Error(
        'PRACTITIONER_OTP_QA_CAPTURE_ENABLED must be disabled in production',
      );
    }

    if (this.enabled && this.allowedAccounts.size === 0) {
      throw new Error(
        'PRACTITIONER_OTP_QA_CAPTURE_ACCOUNTS is required when OTP QA capture is enabled',
      );
    }
  }

  async capture(input: {
    target: string;
    code: string;
    expiresAt: Date;
    purpose: string;
  }): Promise<void> {
    if (!this.shouldCapture(input.target)) return;

    await mkdir(dirname(this.capturePath), { recursive: true, mode: 0o700 });
    await appendFile(
      this.capturePath,
      `${new Date().toISOString()} target=${input.target.trim().toLowerCase()} purpose=${input.purpose} code=${input.code} expiresAt=${input.expiresAt.toISOString()}\n`,
      { encoding: 'utf8', mode: 0o600 },
    );
    await chmod(this.capturePath, 0o600);
  }

  shouldCapture(target: string, purpose = 'PRACTITIONER_LOGIN'): boolean {
    const isPractitionerQaPurpose =
      purpose === 'PRACTITIONER_LOGIN' ||
      purpose === 'PRACTITIONER_SIGNUP_EMAIL_VERIFICATION';
    return (
      isPractitionerQaPurpose &&
      this.enabled &&
      this.allowedAccounts.has(target.trim().toLowerCase())
    );
  }

  async readLatest(
    target: string,
    purpose = 'PRACTITIONER_LOGIN',
  ): Promise<string | null> {
    if (!this.shouldCapture(target, purpose)) return null;
    try {
      const lines = (await readFile(this.capturePath, 'utf8'))
        .trim()
        .split(/\r?\n/)
        .reverse();
      const line = lines.find(
        (candidate) =>
          candidate.includes(`target=${target.trim().toLowerCase()}`) &&
          candidate.includes(`purpose=${purpose}`),
      );
      const match = line?.match(/\bcode=(\d{4,8})\b/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }
}

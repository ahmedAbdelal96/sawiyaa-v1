import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { VerifyOtpChallengeUseCase } from '../../verification/use-cases/verify-otp-challenge.use-case';
import { RegisterPractitionerAccountUseCase } from './register-practitioner-account.use-case';

type PractitionerRegistrationDraft = {
  passwordHash: string;
  displayName: string | null;
  phone: { e164: string; countryCode: string } | null;
  phoneStatus: 'NOT_PROVIDED' | 'NOT_SAVED_INVALID' | 'SAVED';
};

@Injectable()
export class VerifyPractitionerRegistrationEmailUseCase {
  constructor(
    private readonly verifyOtpChallengeUseCase: VerifyOtpChallengeUseCase,
    private readonly registerPractitionerAccountUseCase: RegisterPractitionerAccountUseCase,
  ) {}

  async execute(input: {
    challengeId: string;
    code: string;
    locale: SupportedLocale;
  }) {
    const challenge = await this.verifyOtpChallengeUseCase.execute({
      challengeId: input.challengeId,
      code: input.code,
      purpose: OtpPurpose.PRACTITIONER_SIGNUP_EMAIL_VERIFICATION,
    });
    const metadata = challenge.metadata;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new UnauthorizedException({
        messageKey: 'auth.errors.otpChallengeInvalid',
        error: 'OTP_CHALLENGE_INVALID',
      });
    }
    const draft = metadata as unknown as PractitionerRegistrationDraft;
    const result = await this.registerPractitionerAccountUseCase.execute({
      email: challenge.target,
      password: '',
      passwordHash: draft.passwordHash,
      phoneStatusOverride: draft.phoneStatus,
      phone: draft.phone?.e164 ?? null,
      phoneCountryCode: draft.phone?.countryCode ?? null,
      displayName: draft.displayName,
    });
    return result;
  }
}

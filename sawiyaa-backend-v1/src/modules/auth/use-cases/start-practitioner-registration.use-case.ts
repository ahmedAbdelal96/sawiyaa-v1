import { ConflictException, Injectable } from '@nestjs/common';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PhoneNumberValidationService } from '@common/validation/phone-number-validation.service';
import { UserEmailRepository } from '../repositories/user-email.repository';
import { HashPasswordUseCase } from './hash-password.use-case';
import { CreateOtpChallengeUseCase } from '../../verification/use-cases/create-otp-challenge.use-case';
import { SendOtpChallengeUseCase } from '../../verification/use-cases/send-otp-challenge.use-case';

@Injectable()
export class StartPractitionerRegistrationUseCase {
  constructor(
    private readonly userEmailRepository: UserEmailRepository,
    private readonly hashPasswordUseCase: HashPasswordUseCase,
    private readonly phoneNumberValidationService: PhoneNumberValidationService,
    private readonly createOtpChallengeUseCase: CreateOtpChallengeUseCase,
    private readonly sendOtpChallengeUseCase: SendOtpChallengeUseCase,
  ) {}

  async execute(input: {
    email: string;
    phone?: string | null;
    phoneCountryCode?: string | null;
    password: string;
    displayName?: string | null;
    locale: SupportedLocale;
  }) {
    const email = input.email.trim().toLowerCase();
    if (await this.userEmailRepository.findByEmail(email)) {
      throw new ConflictException({
        messageKey: 'auth.errors.emailAlreadyRegistered',
        error: 'EMAIL_ALREADY_REGISTERED',
      });
    }

    const phone = input.phone?.trim()
      ? this.phoneNumberValidationService.validate(
          input.phone,
          input.phoneCountryCode,
        )
      : null;
    const passwordHash = await this.hashPasswordUseCase.execute(input.password);
    const metadata = {
      passwordHash,
      displayName: input.displayName ?? null,
      phone: phone?.valid
        ? { e164: phone.e164, countryCode: phone.countryCode }
        : null,
      phoneStatus: phone?.valid
        ? 'SAVED'
        : phone
          ? 'NOT_SAVED_INVALID'
          : 'NOT_PROVIDED',
    };
    const challenge = await this.createOtpChallengeUseCase.execute({
      userId: null,
      purpose: OtpPurpose.PRACTITIONER_SIGNUP_EMAIL_VERIFICATION,
      channel: OtpChannel.EMAIL,
      target: email,
      metadata,
    });
    await this.sendOtpChallengeUseCase.execute({
      userId: null,
      challengeId: challenge.challengeId,
      purpose: OtpPurpose.PRACTITIONER_SIGNUP_EMAIL_VERIFICATION,
      channel: challenge.channel,
      target: challenge.target,
      code: challenge.code,
      expiresAt: challenge.expiresAt,
      locale: input.locale,
      isPractitioner: true,
    });
    return {
      challengeId: challenge.challengeId,
      channel: challenge.channel,
      maskedTarget: challenge.maskedTarget,
      expiresAt: challenge.expiresAt,
      requiresOtpVerification: true,
      nextStep: 'OTP_REQUIRED' as const,
    };
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PatientProfileMapper } from '../mappers/patient-profile.mapper';
import { PatientProfileRepository } from '../repositories/patient-profile.repository';
import { PatientUserRepository } from '../repositories/patient-user.repository';
import { UpdatePatientProfileInput } from '../types/patient-profile.types';
import { normalizePatientProfileInput } from '../utils/normalize-patient-profile-input.util';
import { CompletePatientOnboardingUseCase } from './complete-patient-onboarding.use-case';
import { CreatePatientProfileUseCase } from './create-patient-profile.use-case';
import { PatientAvatarStorageService } from '../services/patient-avatar-storage.service';
import { normalizeIanaTimeZoneInput } from '@common/utils/timezone.util';

/**
 * Profile update owns the baseline write path for patient identity/preferences.
 * It may also complete onboarding in the same request when the caller explicitly asks for that behavior.
 * The profile is never auto-completed implicitly by ordinary updates alone.
 */
@Injectable()
export class UpdatePatientProfileUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18nService: I18nService,
    private readonly createPatientProfileUseCase: CreatePatientProfileUseCase,
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly patientUserRepository: PatientUserRepository,
    private readonly completePatientOnboardingUseCase: CompletePatientOnboardingUseCase,
    private readonly patientProfileMapper: PatientProfileMapper,
    private readonly patientAvatarStorageService: PatientAvatarStorageService,
  ) {}

  async execute(input: {
    userId: string;
    locale: SupportedLocale;
    data: UpdatePatientProfileInput;
  }) {
    const normalizedInput = normalizePatientProfileInput(input.data);
    const timezone = normalizeIanaTimeZoneInput(normalizedInput.timezone, {
      messageKey: 'settings.errors.invalidTimezone',
      error: 'SETTINGS_INVALID_TIMEZONE',
    });

    if (normalizedInput.countryCode !== undefined) {
      throw new BadRequestException({
        messageKey: 'patients.errors.countryCodeChangeNotAllowed',
        error: 'COUNTRY_CODE_CHANGE_NOT_ALLOWED',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await this.createPatientProfileUseCase.execute(input.userId, tx);

      await this.patientProfileRepository.updateByUserId(
        input.userId,
        {
          dateOfBirth: normalizedInput.dateOfBirth,
          gender: normalizedInput.gender,
          displayName: normalizedInput.displayName,
        },
        tx,
      );

      await this.patientUserRepository.updatePreferences(
        input.userId,
        {
          defaultLocale: normalizedInput.locale,
          timezone,
        },
        tx,
      );

      const profile = normalizedInput.completeOnboarding
        ? await this.completePatientOnboardingUseCase.execute(input.userId, tx)
        : await this.patientProfileRepository.findByUserId(input.userId, tx);

      const user = await this.patientUserRepository.findProfileSeed(
        input.userId,
        tx,
      );

      return {
        profile: profile!,
        user: user!,
      };
    });

    const [avatarMetadata, avatarDataUrl] = await Promise.all([
      this.patientAvatarStorageService.resolveAvatarMetadata(result.profile.id),
      this.patientAvatarStorageService.resolveAvatarDataUrl(result.profile.id),
    ]);

    return {
      message: this.i18nService.t(
        normalizedInput.completeOnboarding
          ? 'patients.success.onboardingCompleted'
          : 'patients.success.profileUpdated',
        input.locale,
      ),
      profile: this.patientProfileMapper.toViewModel({
        ...result,
        avatarUrl: avatarMetadata?.avatarUrl ?? null,
        avatarDataUrl,
      }),
    };
  }
}

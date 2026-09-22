import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerCredentialMapper } from '../mappers/practitioner-credential.mapper';
import { PractitionerCredentialRepository } from '../repositories/practitioner-credential.repository';
import { PractitionerProfileRepository } from '../repositories/practitioner-profile.repository';
import { PractitionerApplicationRepository } from '../repositories/practitioner-application.repository';

/**
 * Lists credential metadata for the current practitioner account only.
 */
@Injectable()
export class ListPractitionerCredentialsUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly practitionerProfileRepository: PractitionerProfileRepository,
    private readonly practitionerCredentialRepository: PractitionerCredentialRepository,
    private readonly practitionerCredentialMapper: PractitionerCredentialMapper,
    private readonly practitionerApplicationRepository: PractitionerApplicationRepository,
  ) {}

  async execute(input: { userId: string; locale: SupportedLocale }) {
    const profile = await this.practitionerProfileRepository.findByUserId(
      input.userId,
    );

    const application = profile
      ? null
      : await this.practitionerApplicationRepository.findLatestByUserId(input.userId);
    if (!profile && !application) {
      throw new NotFoundException({
        messageKey: 'practitioners.errors.profileNotFound',
        error: 'PRACTITIONER_PROFILE_NOT_FOUND',
      });
    }

    const credentials = profile
      ? await this.practitionerCredentialRepository.listByPractitionerId(profile.id)
      : await this.practitionerCredentialRepository.listByApplicationId(application!.id);

    return {
      message: this.i18nService.t(
        'practitioners.success.credentialsFetched',
        input.locale,
      ),
      credentials: credentials.map((item) =>
        this.practitionerCredentialMapper.toViewModel(item),
      ),
    };
  }
}

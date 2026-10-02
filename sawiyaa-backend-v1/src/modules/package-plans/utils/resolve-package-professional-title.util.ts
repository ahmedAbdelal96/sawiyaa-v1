import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerProfessionalContentRecord } from '@modules/practitioners/repositories/practitioner-professional-content.repository';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';

export function resolvePackageProfessionalTitle(input: {
  requestedLocale: SupportedLocale;
  resolver: PractitionerProfessionalContentResolver;
  record?: PractitionerProfessionalContentRecord | null;
  legacyProfessionalTitle?: string | null;
}) {
  return input.resolver.resolve({
    requestedLocale: input.requestedLocale,
    primaryContentLocale: input.record?.primaryContentLocale,
    translations: input.record?.professionalContentTranslations,
    legacyProfessionalTitle:
      input.record?.professionalTitle ?? input.legacyProfessionalTitle ?? null,
    legacyBio: input.record?.bio ?? null,
  }).professionalTitle;
}

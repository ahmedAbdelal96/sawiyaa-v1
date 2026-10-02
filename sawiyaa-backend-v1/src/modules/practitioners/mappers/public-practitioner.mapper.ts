import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  PublicPractitionerDetailsViewModel,
  PublicPractitionerListItemViewModel,
} from '../types/public-practitioner.types';
import { localizeSpecialtyTitle } from '@modules/specialties/utils/localize-specialty-title.util';

/**
 * Mapper for public practitioner read responses.
 * It keeps public-safe shape stable and strips internal-only fields.
 */
@Injectable()
export class PublicPractitionerMapper {
  private readonly bioSnippetMaxLength = 180;

  pickLocalizedTitle(
    translations: Array<{ locale: string; title: string }>,
    locale: SupportedLocale,
    compatibility?: {
      nameAr?: string | null;
      nameEn?: string | null;
      fallback?: string | null;
    },
  ): string | null {
    return localizeSpecialtyTitle({
      locale,
      translations,
      ...compatibility,
    });
  }

  toBioSnippet(fullBio: string | null): string | null {
    if (!fullBio) {
      return null;
    }

    if (fullBio.length <= this.bioSnippetMaxLength) {
      return fullBio;
    }

    return `${fullBio.slice(0, this.bioSnippetMaxLength).trim()}...`;
  }

  toListItem(input: PublicPractitionerListItemViewModel) {
    return input;
  }

  toDetails(input: PublicPractitionerDetailsViewModel) {
    return input;
  }
}

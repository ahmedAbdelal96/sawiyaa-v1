import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  normalizeProfessionalContentValue,
  PractitionerProfessionalContentValue,
} from '../utils/practitioner-professional-content.util';

export type PractitionerProfessionalContentTranslation =
  PractitionerProfessionalContentValue & {
    locale: SupportedLocale;
  };

export type ResolvePractitionerProfessionalContentInput = {
  requestedLocale: SupportedLocale;
  primaryContentLocale?: SupportedLocale | null;
  defaultLocale?: SupportedLocale | null;
  translations?: PractitionerProfessionalContentTranslation[] | null;
  legacyProfessionalTitle?: string | null;
  legacyBio?: string | null;
};

export type ResolvedPractitionerProfessionalContent = {
  professionalTitle: string | null;
  bio: string | null;
};

/**
 * Resolves practitioner-authored professional content for presentation only.
 *
 * This service deliberately does not evaluate readiness, publication,
 * approval, verification, booking, or session eligibility. Those decisions
 * remain owned by their existing domain policies and use cases.
 */
@Injectable()
export class PractitionerProfessionalContentResolver {
  resolve(
    input: ResolvePractitionerProfessionalContentInput,
  ): ResolvedPractitionerProfessionalContent {
    const translationsByLocale = new Map(
      (input.translations ?? []).map((translation) => [
        translation.locale,
        translation,
      ]),
    );
    const localeOrder = this.buildLocaleOrder(input);

    return {
      professionalTitle: this.resolveField(
        localeOrder,
        translationsByLocale,
        'professionalTitle',
        input.legacyProfessionalTitle,
      ),
      bio: this.resolveField(
        localeOrder,
        translationsByLocale,
        'bio',
        input.legacyBio,
      ),
    };
  }

  private buildLocaleOrder(
    input: ResolvePractitionerProfessionalContentInput,
  ): SupportedLocale[] {
    return Array.from(
      new Set<SupportedLocale>([
        input.requestedLocale,
        ...(input.primaryContentLocale ? [input.primaryContentLocale] : []),
        ...(input.defaultLocale ? [input.defaultLocale] : []),
        input.requestedLocale === 'ar' ? 'en' : 'ar',
      ]),
    );
  }

  private resolveField(
    localeOrder: SupportedLocale[],
    translationsByLocale: Map<
      SupportedLocale,
      PractitionerProfessionalContentTranslation
    >,
    field: keyof PractitionerProfessionalContentValue,
    legacyValue?: string | null,
  ) {
    for (const locale of localeOrder) {
      const translatedValue = normalizeProfessionalContentValue(
        translationsByLocale.get(locale)?.[field],
      );

      if (translatedValue) {
        return translatedValue;
      }
    }

    return normalizeProfessionalContentValue(legacyValue);
  }
}

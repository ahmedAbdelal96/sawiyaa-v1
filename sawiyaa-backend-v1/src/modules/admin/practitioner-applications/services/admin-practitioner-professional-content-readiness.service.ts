import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerProfessionalContentAuthoringService } from '@modules/practitioners/services/practitioner-professional-content-authoring.service';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';
import {
  isProfessionalContentLocaleComplete,
  normalizeProfessionalContentValue,
} from '@modules/practitioners/utils/practitioner-professional-content.util';

export type AdminProfessionalContentLocaleReadiness = {
  professionalTitle: string | null;
  bio: string | null;
  titleComplete: boolean;
  bioComplete: boolean;
  complete: boolean;
};

export type AdminProfessionalContentReadiness = {
  primaryContentLocale: SupportedLocale | null;
  locales: Record<SupportedLocale, AdminProfessionalContentLocaleReadiness>;
  bilingualComplete: boolean;
  fallbackActive: boolean;
  sourceLocaleUnresolved: boolean;
};

export type AdminProfessionalContentValueSource = {
  primaryContentLocale?: SupportedLocale | null;
  professionalTitle?: string | null;
  bio?: string | null;
  professionalContentTranslations?: Array<{
    locale: string;
    professionalTitle?: string | null;
    bio?: string | null;
  }>;
};

export type AdminProfessionalContentReadinessView = {
  readiness: AdminProfessionalContentReadiness;
  legacyContent: {
    professionalTitle: string | null;
    bio: string | null;
  } | null;
  legacySnapshot: boolean;
};

export type AdminProfessionalContentChangedField = {
  path: string;
  locale: SupportedLocale | null;
  field: 'professionalTitle' | 'bio' | 'primaryContentLocale';
  status: 'ADDED' | 'REMOVED' | 'MODIFIED';
  currentValue: string | null;
  proposedValue: string | null;
};

export type AdminProfessionalContentReview = {
  currentApproved: AdminProfessionalContentReadinessView;
  proposed: AdminProfessionalContentReadinessView;
  changedFields: AdminProfessionalContentChangedField[];
};

type NormalizedSource = {
  primaryContentLocale: SupportedLocale | null;
  locales: Record<
    SupportedLocale,
    { professionalTitle: string | null; bio: string | null }
  >;
  translations: Array<{
    locale: SupportedLocale;
    professionalTitle: string | null;
    bio: string | null;
  }>;
  legacyContent: {
    professionalTitle: string | null;
    bio: string | null;
  } | null;
  legacySnapshot: boolean;
};

const LOCALES = ['ar', 'en'] as const satisfies readonly SupportedLocale[];
const CONTENT_FIELDS = ['professionalTitle', 'bio'] as const;

function emptyLocales(): NormalizedSource['locales'] {
  return {
    ar: { professionalTitle: null, bio: null },
    en: { professionalTitle: null, bio: null },
  };
}

function normalizeLegacyContent(source: {
  professionalTitle?: string | null;
  bio?: string | null;
}) {
  const professionalTitle = normalizeProfessionalContentValue(
    source.professionalTitle,
  );
  const bio = normalizeProfessionalContentValue(source.bio);
  return professionalTitle || bio ? { professionalTitle, bio } : null;
}

function normalizeLocaleContent(source: {
  professionalTitle?: string | null;
  bio?: string | null;
}) {
  return {
    professionalTitle: normalizeProfessionalContentValue(
      source.professionalTitle,
    ),
    bio: normalizeProfessionalContentValue(source.bio),
  };
}

@Injectable()
export class AdminPractitionerProfessionalContentReadinessService {
  constructor(
    private readonly resolver: PractitionerProfessionalContentResolver,
    private readonly authoring: PractitionerProfessionalContentAuthoringService,
  ) {}

  fromLive(source: AdminProfessionalContentValueSource) {
    return this.toView(this.normalizeSource(source));
  }

  fromSnapshot(
    snapshotProfile: unknown,
    fallbackLive?: AdminProfessionalContentValueSource,
  ) {
    const profile = this.asRecord(snapshotProfile);
    const localizedSnapshot = this.authoring.readSnapshot({
      profile: profile
        ? { professionalContent: profile.professionalContent }
        : undefined,
    });

    if (localizedSnapshot) {
      const locales = emptyLocales();
      const translations: NormalizedSource['translations'] = [];
      for (const locale of LOCALES) {
        const value = this.asRecord(localizedSnapshot.locales[locale]);
        if (!value) continue;
        const content = normalizeLocaleContent(value);
        locales[locale] = content;
        translations.push({ locale, ...content });
      }

      const legacyContent = normalizeLegacyContent({
        professionalTitle: this.stringOrNull(profile?.professionalTitle),
        bio: this.stringOrNull(profile?.bio),
      });
      const primaryContentLocale = localizedSnapshot.primaryContentLocale;
      if (primaryContentLocale && legacyContent) {
        locales[primaryContentLocale] = {
          professionalTitle:
            locales[primaryContentLocale].professionalTitle ??
            legacyContent.professionalTitle,
          bio: locales[primaryContentLocale].bio ?? legacyContent.bio,
        };
      }

      return this.toView({
        primaryContentLocale,
        locales,
        translations,
        legacyContent,
        legacySnapshot: false,
      });
    }

    const legacyContent = profile
      ? normalizeLegacyContent({
          professionalTitle: this.stringOrNull(profile.professionalTitle),
          bio: this.stringOrNull(profile.bio),
        })
      : fallbackLive
        ? normalizeLegacyContent(fallbackLive)
        : null;

    return this.toView({
      primaryContentLocale: null,
      locales: emptyLocales(),
      translations: [],
      legacyContent,
      legacySnapshot: true,
    });
  }

  buildReview(
    currentApproved: AdminProfessionalContentValueSource,
    proposed: AdminProfessionalContentReadinessView,
  ): AdminProfessionalContentReview {
    const current = this.fromLive(currentApproved);
    const changedFields: AdminProfessionalContentChangedField[] = [];

    for (const locale of LOCALES) {
      for (const field of CONTENT_FIELDS) {
        const currentValue = current.readiness.locales[locale][field];
        const proposedValue = proposed.readiness.locales[locale][field];
        if (currentValue === proposedValue) continue;
        changedFields.push({
          path: `professionalContent.${locale}.${field}`,
          locale,
          field,
          status:
            currentValue === null
              ? 'ADDED'
              : proposedValue === null
                ? 'REMOVED'
                : 'MODIFIED',
          currentValue,
          proposedValue,
        });
      }
    }

    const currentPrimary = current.readiness.primaryContentLocale;
    const proposedPrimary = proposed.readiness.primaryContentLocale;
    if (currentPrimary !== proposedPrimary) {
      changedFields.push({
        path: 'primaryContentLocale',
        locale: null,
        field: 'primaryContentLocale',
        status:
          currentPrimary === null
            ? 'ADDED'
            : proposedPrimary === null
              ? 'REMOVED'
              : 'MODIFIED',
        currentValue: currentPrimary,
        proposedValue: proposedPrimary,
      });
    }

    return {
      currentApproved: current,
      proposed,
      changedFields,
    };
  }

  private normalizeSource(
    source: AdminProfessionalContentValueSource,
  ): NormalizedSource {
    const locales = emptyLocales();
    const translations: NormalizedSource['translations'] = [];
    for (const locale of LOCALES) {
      const row = source.professionalContentTranslations?.find(
        (translation) => translation.locale === locale,
      );
      const content = normalizeLocaleContent(row ?? {});
      locales[locale] = content;
      if (row) translations.push({ locale, ...content });
    }

    const legacyContent = normalizeLegacyContent(source);
    const primaryContentLocale = source.primaryContentLocale ?? null;
    if (primaryContentLocale && legacyContent) {
      locales[primaryContentLocale] = {
        professionalTitle:
          locales[primaryContentLocale].professionalTitle ??
          legacyContent.professionalTitle,
        bio: locales[primaryContentLocale].bio ?? legacyContent.bio,
      };
    }

    return {
      primaryContentLocale,
      locales,
      translations,
      legacyContent,
      legacySnapshot: false,
    };
  }

  private toView(
    source: NormalizedSource,
  ): AdminProfessionalContentReadinessView {
    const locales = Object.fromEntries(
      LOCALES.map((locale) => {
        const content = source.locales[locale];
        return [
          locale,
          {
            ...content,
            titleComplete: Boolean(content.professionalTitle),
            bioComplete: Boolean(content.bio),
            complete: isProfessionalContentLocaleComplete(content),
          },
        ];
      }),
    ) as Record<SupportedLocale, AdminProfessionalContentLocaleReadiness>;

    const fallbackActive = LOCALES.some((locale) => {
      const content = source.locales[locale];
      const resolved = this.resolver.resolve({
        requestedLocale: locale,
        primaryContentLocale: source.primaryContentLocale,
        translations: source.translations,
        legacyProfessionalTitle: source.legacyContent?.professionalTitle,
        legacyBio: source.legacyContent?.bio,
      });
      return CONTENT_FIELDS.some(
        (field) => !content[field] && Boolean(resolved[field]),
      );
    });

    return {
      readiness: {
        primaryContentLocale: source.primaryContentLocale,
        locales,
        bilingualComplete: locales.ar.complete && locales.en.complete,
        fallbackActive,
        sourceLocaleUnresolved:
          Boolean(source.legacyContent) && source.primaryContentLocale === null,
      },
      legacyContent: source.legacyContent,
      legacySnapshot: source.legacySnapshot,
    };
  }

  private asRecord(value: unknown): Record<string, any> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : null;
  }

  private stringOrNull(value: unknown) {
    return typeof value === 'string' ? value : null;
  }
}

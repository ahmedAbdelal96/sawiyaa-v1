import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, ContentLocale } from '@prisma/client';
import { normalizeProfessionalContentValue } from '../utils/practitioner-professional-content.util';
import {
  assertProfessionalTitle,
  normalizeProfessionalTitle,
} from '../constants/professional-title.constants';
import { SupportedLocale } from '@common/i18n/types/locale.types';

export type ProfessionalContentLocaleInput = {
  professionalTitle?: string | null;
  bio?: string | null;
};

export type ProfessionalContentAuthoringInput = {
  professionalContent?: Partial<
    Record<SupportedLocale, ProfessionalContentLocaleInput | null>
  > | null;
  primaryContentLocale?: SupportedLocale | null;
  professionalTitle?: string | null;
  bio?: string | null;
};

export type ProfessionalContentState = {
  primaryContentLocale?: SupportedLocale | null;
  professionalTitle?: string | null;
  bio?: string | null;
  translations?: Array<{
    locale: SupportedLocale | ContentLocale;
    professionalTitle?: string | null;
    bio?: string | null;
  }>;
};

export type ProfessionalContentSnapshot = {
  version: 1;
  primaryContentLocale: SupportedLocale | null;
  locales: Partial<Record<SupportedLocale, ProfessionalContentLocaleInput>>;
};

export type ProfessionalContentPlan = {
  normalized: ProfessionalContentAuthoringInput;
  state: Required<Pick<ProfessionalContentState, 'primaryContentLocale'>> & {
    professionalTitle: string | null;
    bio: string | null;
    translations: Array<{
      locale: SupportedLocale;
      professionalTitle: string | null;
      bio: string | null;
    }>;
  };
  translationWrites: Array<{
    locale: SupportedLocale;
    professionalTitle?: string | null;
    bio?: string | null;
  }>;
  legacyProjection: {
    professionalTitle?: string | null;
    bio?: string | null;
  };
  primaryContentLocaleWasProvided: boolean;
  changedFieldPaths: string[];
};

type SnapshotLike = {
  profile?: {
    professionalTitle?: string | null;
    bio?: string | null;
    professionalContent?: unknown;
    primaryContentLocale?: unknown;
  };
};

/**
 * Owns the additive professional-content write contract. This service is
 * intentionally orchestration-free: use cases provide the transaction and
 * decide whether a plan is applied live or only placed in a review snapshot.
 */
@Injectable()
export class PractitionerProfessionalContentAuthoringService {
  private normalizeBounded(
    value: string | null | undefined,
    maxLength: number,
    fieldPath: string,
  ) {
    const normalized = normalizeProfessionalContentValue(value);
    if (normalized !== null && normalized.length > maxLength) {
      throw new BadRequestException({
        error: 'PRACTITIONER_PROFESSIONAL_CONTENT_TOO_LONG',
        fieldPath,
        maxLength,
      });
    }
    return normalized;
  }

  normalize(
    input: ProfessionalContentAuthoringInput,
  ): ProfessionalContentAuthoringInput {
    const normalizedLocales: Partial<
      Record<SupportedLocale, ProfessionalContentLocaleInput>
    > = {};

    for (const locale of ['ar', 'en'] as const) {
      const content = input.professionalContent?.[locale];
      if (content === undefined || content === null) continue;
      normalizedLocales[locale] = {
        ...(content.professionalTitle !== undefined
          ? {
              professionalTitle: (() => {
                const value = this.normalizeBounded(
                  content.professionalTitle,
                  191,
                  `professionalContent.${locale}.professionalTitle`,
                );
                return value === null
                  ? null
                  : (normalizeProfessionalTitle(value) ?? value);
              })(),
            }
          : {}),
        ...(content.bio !== undefined
          ? {
              bio: this.normalizeBounded(
                content.bio,
                4000,
                `professionalContent.${locale}.bio`,
              ),
            }
          : {}),
      };
    }

    return {
      ...(input.professionalContent !== undefined
        ? { professionalContent: normalizedLocales }
        : {}),
      ...(input.primaryContentLocale !== undefined
        ? { primaryContentLocale: input.primaryContentLocale }
        : {}),
      ...(input.professionalTitle !== undefined
        ? {
            professionalTitle: (() => {
              this.normalizeBounded(
                input.professionalTitle,
                191,
                'professionalTitle',
              );
              return assertProfessionalTitle(input.professionalTitle);
            })(),
          }
        : {}),
      ...(input.bio !== undefined
        ? { bio: this.normalizeBounded(input.bio, 4000, 'bio') }
        : {}),
    };
  }

  plan(
    existing: ProfessionalContentState,
    input: ProfessionalContentAuthoringInput,
  ): ProfessionalContentPlan {
    const normalized = this.normalize(input);
    const hasLegacyFields =
      normalized.professionalTitle !== undefined ||
      normalized.bio !== undefined;
    const hasLocalizedPayload = normalized.professionalContent !== undefined;
    const primaryContentLocaleWasProvided =
      normalized.primaryContentLocale !== undefined;
    const effectiveLocale =
      (primaryContentLocaleWasProvided
        ? normalized.primaryContentLocale
        : existing.primaryContentLocale) ?? null;

    if (hasLegacyFields && hasLocalizedPayload && !effectiveLocale) {
      throw new BadRequestException({
        error: 'PRACTITIONER_PROFESSIONAL_CONTENT_LOCALE_REQUIRED',
        message:
          'Mixed legacy and localized professional content requires an explicit or existing primaryContentLocale.',
      });
    }

    const localized = {
      ...(normalized.professionalContent ?? {}),
    } as Partial<Record<SupportedLocale, ProfessionalContentLocaleInput>>;
    if (hasLegacyFields && effectiveLocale) {
      const target = { ...(localized[effectiveLocale] ?? {}) };
      for (const field of ['professionalTitle', 'bio'] as const) {
        const legacyValue = normalized[field];
        if (legacyValue === undefined) continue;
        const localizedValue = target[field];
        if (localizedValue !== undefined && localizedValue !== legacyValue) {
          throw new BadRequestException({
            error: 'PRACTITIONER_PROFESSIONAL_CONTENT_CONFLICT',
            fieldPath: `professionalContent.${effectiveLocale}.${field}`,
            message: `Legacy ${field} conflicts with localized ${effectiveLocale} content.`,
          });
        }
        if (localizedValue === undefined) target[field] = legacyValue;
      }
      localized[effectiveLocale] = target;
    }

    const currentByLocale = new Map<
      SupportedLocale,
      { professionalTitle: string | null; bio: string | null }
    >();
    for (const translation of existing.translations ?? []) {
      if (translation.locale !== 'ar' && translation.locale !== 'en') continue;
      currentByLocale.set(translation.locale, {
        professionalTitle: normalizeProfessionalContentValue(
          translation.professionalTitle,
        ),
        bio: normalizeProfessionalContentValue(translation.bio),
      });
    }

    const translationWrites: ProfessionalContentPlan['translationWrites'] = [];
    const changedFieldPaths: string[] = [];
    for (const locale of ['ar', 'en'] as const) {
      const content = localized[locale];
      if (content === undefined) continue;
      const write: ProfessionalContentPlan['translationWrites'][number] = {
        locale,
      };
      if (content.professionalTitle !== undefined) {
        write.professionalTitle = content.professionalTitle;
        changedFieldPaths.push(
          `professionalContent.${locale}.professionalTitle`,
        );
      }
      if (content.bio !== undefined) {
        write.bio = content.bio;
        changedFieldPaths.push(`professionalContent.${locale}.bio`);
      }
      if (write.professionalTitle !== undefined || write.bio !== undefined) {
        translationWrites.push(write);
        const current = currentByLocale.get(locale) ?? {
          professionalTitle: null,
          bio: null,
        };
        currentByLocale.set(locale, {
          professionalTitle:
            write.professionalTitle !== undefined
              ? write.professionalTitle
              : current.professionalTitle,
          bio: write.bio !== undefined ? write.bio : current.bio,
        });
      }
    }

    if (normalized.primaryContentLocale !== undefined) {
      changedFieldPaths.push('primaryContentLocale');
    }
    if (normalized.professionalTitle !== undefined)
      changedFieldPaths.push('professionalTitle');
    if (normalized.bio !== undefined) changedFieldPaths.push('bio');

    if (
      hasLegacyFields &&
      !hasLocalizedPayload &&
      existing.primaryContentLocale
    ) {
      const locale = existing.primaryContentLocale;
      const current = currentByLocale.get(locale) ?? {
        professionalTitle: null,
        bio: null,
      };
      const write = {
        locale,
        ...(normalized.professionalTitle !== undefined
          ? { professionalTitle: normalized.professionalTitle }
          : {}),
        ...(normalized.bio !== undefined ? { bio: normalized.bio } : {}),
      };
      translationWrites.push(write);
      currentByLocale.set(locale, {
        professionalTitle:
          normalized.professionalTitle !== undefined
            ? normalized.professionalTitle
            : current.professionalTitle,
        bio: normalized.bio !== undefined ? normalized.bio : current.bio,
      });
    }

    const primaryAfter = primaryContentLocaleWasProvided
      ? (normalized.primaryContentLocale ?? null)
      : (existing.primaryContentLocale ?? null);
    const legacyProjection: ProfessionalContentPlan['legacyProjection'] = {};
    if (primaryAfter) {
      const primary = currentByLocale.get(primaryAfter);
      const primaryWrite = translationWrites.find(
        (item) => item.locale === primaryAfter,
      );
      const existingTitle = normalizeProfessionalContentValue(
        existing.professionalTitle,
      );
      const existingBio = normalizeProfessionalContentValue(existing.bio);
      const projectedTitle =
        primaryWrite?.professionalTitle !== undefined
          ? primaryWrite.professionalTitle
          : (primary?.professionalTitle ?? existingTitle);
      const projectedBio =
        primaryWrite?.bio !== undefined
          ? primaryWrite.bio
          : (primary?.bio ?? existingBio);
      if (projectedTitle !== undefined)
        legacyProjection.professionalTitle = projectedTitle;
      if (projectedBio !== undefined) legacyProjection.bio = projectedBio;
    } else {
      if (normalized.professionalTitle !== undefined) {
        legacyProjection.professionalTitle = normalized.professionalTitle;
      }
      if (normalized.bio !== undefined) legacyProjection.bio = normalized.bio;
    }

    return {
      normalized,
      state: {
        primaryContentLocale: primaryAfter,
        professionalTitle:
          legacyProjection.professionalTitle ??
          normalizeProfessionalContentValue(existing.professionalTitle),
        bio:
          legacyProjection.bio ??
          normalizeProfessionalContentValue(existing.bio),
        translations: [...currentByLocale.entries()].map(
          ([locale, content]) => ({ locale, ...content }),
        ),
      },
      translationWrites,
      legacyProjection,
      primaryContentLocaleWasProvided,
      changedFieldPaths: [...new Set(changedFieldPaths)],
    };
  }

  async applyDirect(
    tx: Prisma.TransactionClient,
    practitionerProfileId: string,
    existing: ProfessionalContentState,
    input: ProfessionalContentAuthoringInput,
  ) {
    const plan = this.plan(existing, input);
    for (const write of plan.translationWrites) {
      await tx.practitionerProfileTranslation.upsert({
        where: {
          practitionerProfileId_locale: {
            practitionerProfileId,
            locale: write.locale,
          },
        },
        create: {
          practitionerProfileId,
          locale: write.locale,
          professionalTitle: write.professionalTitle ?? null,
          bio: write.bio ?? null,
        },
        update: {
          ...(write.professionalTitle !== undefined
            ? { professionalTitle: write.professionalTitle }
            : {}),
          ...(write.bio !== undefined ? { bio: write.bio } : {}),
        },
      });
    }

    const profileUpdate: Prisma.PractitionerProfileUncheckedUpdateInput = {
      ...(plan.primaryContentLocaleWasProvided
        ? { primaryContentLocale: plan.state.primaryContentLocale }
        : {}),
      ...plan.legacyProjection,
    };
    if (Object.keys(profileUpdate).length > 0) {
      await tx.practitionerProfile.update({
        where: { id: practitionerProfileId },
        data: profileUpdate,
      });
    }
    return plan;
  }

  toSnapshot(
    plan: ProfessionalContentPlan | ProfessionalContentState,
  ): ProfessionalContentSnapshot {
    const state = 'state' in plan ? plan.state : plan;
    const locales: ProfessionalContentSnapshot['locales'] = {};
    for (const translation of state.translations ?? []) {
      if (translation.professionalTitle === null && translation.bio === null)
        continue;
      locales[translation.locale as SupportedLocale] = {
        professionalTitle: translation.professionalTitle,
        bio: translation.bio,
      };
    }
    return {
      version: 1,
      primaryContentLocale: state.primaryContentLocale ?? null,
      locales,
    };
  }

  readSnapshot(snapshot: SnapshotLike) {
    const raw = snapshot.profile?.professionalContent;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const candidate = raw as Partial<ProfessionalContentSnapshot>;
    if (
      candidate.version !== 1 ||
      !candidate.locales ||
      typeof candidate.locales !== 'object'
    )
      return null;
    return {
      primaryContentLocale:
        candidate.primaryContentLocale === 'ar' ||
        candidate.primaryContentLocale === 'en'
          ? candidate.primaryContentLocale
          : null,
      locales: candidate.locales,
    };
  }

  async applySnapshot(
    tx: Prisma.TransactionClient,
    practitionerProfileId: string,
    snapshot: SnapshotLike,
  ) {
    const localized = this.readSnapshot(snapshot);
    if (!localized) return false;

    await tx.practitionerProfileTranslation.deleteMany({
      where: { practitionerProfileId },
    });
    const rows = (['ar', 'en'] as const)
      .map((locale) => ({ locale, content: localized.locales[locale] }))
      .filter(
        (item) =>
          item.content &&
          (item.content.professionalTitle != null || item.content.bio != null),
      );
    if (rows.length > 0) {
      await tx.practitionerProfileTranslation.createMany({
        data: rows.map(({ locale, content }) => ({
          practitionerProfileId,
          locale,
          professionalTitle: normalizeProfessionalContentValue(
            content?.professionalTitle,
          ),
          bio: normalizeProfessionalContentValue(content?.bio),
        })),
      });
    }

    const primary = localized.primaryContentLocale;
    const primaryContent = primary ? localized.locales[primary] : undefined;
    await tx.practitionerProfile.update({
      where: { id: practitionerProfileId },
      data: {
        primaryContentLocale: primary,
        ...(snapshot.profile?.professionalTitle !== undefined
          ? { professionalTitle: snapshot.profile.professionalTitle }
          : primaryContent?.professionalTitle !== undefined
            ? {
                professionalTitle: normalizeProfessionalContentValue(
                  primaryContent.professionalTitle,
                ),
              }
            : {}),
        ...(snapshot.profile?.bio !== undefined
          ? { bio: snapshot.profile.bio }
          : primaryContent?.bio !== undefined
            ? { bio: normalizeProfessionalContentValue(primaryContent.bio) }
            : {}),
      },
    });
    return true;
  }
}

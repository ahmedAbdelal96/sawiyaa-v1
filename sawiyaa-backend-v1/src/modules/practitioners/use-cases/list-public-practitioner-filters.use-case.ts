import { Injectable } from '@nestjs/common';
import { resolvePaymentRegionalResolution } from '@common/payments/payment-region.resolver';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PatientProfileRepository } from '@modules/patients/repositories/patient-profile.repository';
import { PractitionerType } from '@prisma/client';
import { PublicPractitionerReadRepository } from '../repositories/public-practitioner-read.repository';

type FilterSourceRow = Awaited<
  ReturnType<PublicPractitionerReadRepository['listPublicFilterMetadataSource']>
>[number];

@Injectable()
export class ListPublicPractitionerFiltersUseCase {
  constructor(
    private readonly publicReadRepository: PublicPractitionerReadRepository,
    private readonly patientProfileRepository: PatientProfileRepository,
  ) {}

  async execute(input: {
    locale: SupportedLocale;
    currentUserId?: string | null;
  }) {
    const patientProfile = input.currentUserId
      ? await this.patientProfileRepository.findByUserId(input.currentUserId)
      : null;
    const regionalResolution = resolvePaymentRegionalResolution({
      patientCountryIsoCode: patientProfile?.country?.isoCode ?? null,
    });
    const currencyCode = regionalResolution.currencyCode as 'EGP' | 'USD';
    const rows = await this.publicReadRepository.listPublicFilterMetadataSource(
      {
        locale: input.locale,
        currencyCode,
      },
    );

    const specialtyMap = new Map<
      string,
      {
        id: string;
        slug: string;
        name: string;
        category: { id: string; slug: string; name: string } | null;
        practitionerIds: Set<string>;
      }
    >();
    const categoryMap = new Map<
      string,
      {
        value: string;
        label: string;
        practitionerIds: Set<string>;
      }
    >();
    const languageMap = new Map<
      string,
      { value: string; label: string; practitionerIds: Set<string> }
    >();
    const countryMap = new Map<
      string,
      { value: string; label: string; practitionerIds: Set<string> }
    >();
    const kindMap = new Map<
      string,
      { value: string; label: string; practitionerIds: Set<string> }
    >();
    const genderMap = new Map<
      string,
      { value: string; label: string; practitionerIds: Set<string> }
    >();
    const durationMap = new Map<
      number,
      { value: number; label: string; practitionerIds: Set<string> }
    >();

    const feeValues: number[] = [];

    for (const row of rows) {
      const practitionerId = row.id;

      for (const link of row.specialties) {
        const localizedTitle =
          link.specialty.translations.find(
            (translation) => translation.locale === input.locale,
          )?.title ??
          link.specialty.translations.find(
            (translation) => translation.locale === 'en',
          )?.title ??
          link.specialty.slug;

        const category = link.specialty.category
          ? {
              id: link.specialty.category.id,
              slug: link.specialty.category.slug,
              name: this.pickLocalizedLabel(
                input.locale,
                link.specialty.category.name,
                link.specialty.category.name,
              ),
            }
          : null;

        const existingSpecialty = specialtyMap.get(link.specialtyId);
        if (existingSpecialty) {
          existingSpecialty.practitionerIds.add(practitionerId);
        } else {
          specialtyMap.set(link.specialtyId, {
            id: link.specialtyId,
            slug: link.specialty.slug,
            name: localizedTitle,
            category,
            practitionerIds: new Set([practitionerId]),
          });
        }

        if (category) {
          const existingCategory = categoryMap.get(category.slug);
          if (existingCategory) {
            existingCategory.practitionerIds.add(practitionerId);
          } else {
            categoryMap.set(category.slug, {
              value: category.slug,
              label: category.name,
              practitionerIds: new Set([practitionerId]),
            });
          }
        }
      }

      for (const languageLink of row.languages) {
        const code = languageLink.language.code.toLowerCase();
        const label = this.pickLocalizedLabel(
          input.locale,
          languageLink.language.nativeName,
          languageLink.language.name,
        );
        const existing = languageMap.get(code);
        if (existing) {
          existing.practitionerIds.add(practitionerId);
        } else {
          languageMap.set(code, {
            value: code,
            label,
            practitionerIds: new Set([practitionerId]),
          });
        }
      }

      if (row.country?.isoCode) {
        const value = row.country.isoCode.toUpperCase();
        const label = this.pickLocalizedLabel(
          input.locale,
          row.country.nativeName,
          row.country.name,
        );
        const existing = countryMap.get(value);
        if (existing) {
          existing.practitionerIds.add(practitionerId);
        } else {
          countryMap.set(value, {
            value,
            label,
            practitionerIds: new Set([practitionerId]),
          });
        }
      }

      const kindValue = this.mapPractitionerKind(row.practitionerType);
      const existingKind = kindMap.get(kindValue);
      if (existingKind) {
        existingKind.practitionerIds.add(practitionerId);
      } else {
        kindMap.set(kindValue, {
          value: kindValue,
          label: this.getPractitionerKindLabel(kindValue, input.locale),
          practitionerIds: new Set([practitionerId]),
        });
      }

      if (row.practitionerGender) {
        const genderValue = row.practitionerGender.toLowerCase();
        const existingGender = genderMap.get(genderValue);
        if (existingGender) {
          existingGender.practitionerIds.add(practitionerId);
        } else {
          genderMap.set(genderValue, {
            value: genderValue,
            label: this.getGenderLabel(genderValue, input.locale),
            practitionerIds: new Set([practitionerId]),
          });
        }
      }

      const price30 = this.pickCurrencyAwareFee(row, currencyCode, 30);
      const price60 = this.pickCurrencyAwareFee(row, currencyCode, 60);

      if (price30 !== null) {
        feeValues.push(price30);
        this.upsertDuration(durationMap, 30, practitionerId, input.locale);
      }

      if (price60 !== null) {
        feeValues.push(price60);
        this.upsertDuration(durationMap, 60, practitionerId, input.locale);
      }
    }

    const ratingThresholds = [3, 4, 4.5].map((value) => ({
      value,
      label: this.getRatingThresholdLabel(value, input.locale),
    }));

    return {
      specialties: Array.from(specialtyMap.values())
        .map((item) => ({
          id: item.id,
          slug: item.slug,
          name: item.name,
          category: item.category,
          practitionerCount: item.practitionerIds.size,
        }))
        .sort((left, right) => {
          if (right.practitionerCount !== left.practitionerCount) {
            return right.practitionerCount - left.practitionerCount;
          }
          return left.name.localeCompare(right.name);
        }),
      specialtyCategories: this.sortCountOptions(categoryMap),
      languages: this.sortCountOptions(languageMap),
      countries: this.sortCountOptions(countryMap),
      practitionerKinds: this.sortCountOptions(kindMap),
      genders: this.sortCountOptions(genderMap),
      durations: Array.from(durationMap.values())
        .map((item) => ({
          value: item.value,
          label: item.label,
          practitionerCount: item.practitionerIds.size,
        }))
        .sort((left, right) => left.value - right.value),
      ratingThresholds,
      feeBounds: {
        min: feeValues.length > 0 ? Math.min(...feeValues) : 0,
        max: feeValues.length > 0 ? Math.max(...feeValues) : 0,
        currency: currencyCode,
        step: currencyCode === 'EGP' ? 50 : 5,
      },
      availability: {
        onlineNowSupported: true as const,
        availableTodaySupported: false as const,
        availableThisWeekSupported: false as const,
      },
    };
  }

  private sortCountOptions(
    source: Map<
      string,
      { value: string; label: string; practitionerIds: Set<string> }
    >,
  ) {
    return Array.from(source.values())
      .map((item) => ({
        value: item.value,
        label: item.label,
        practitionerCount: item.practitionerIds.size,
      }))
      .sort((left, right) => {
        if (right.practitionerCount !== left.practitionerCount) {
          return right.practitionerCount - left.practitionerCount;
        }
        return left.label.localeCompare(right.label);
      });
  }

  private upsertDuration(
    durationMap: Map<
      number,
      { value: number; label: string; practitionerIds: Set<string> }
    >,
    duration: 30 | 60,
    practitionerId: string,
    locale: SupportedLocale,
  ) {
    const existing = durationMap.get(duration);
    if (existing) {
      existing.practitionerIds.add(practitionerId);
      return;
    }

    durationMap.set(duration, {
      value: duration,
      label: this.getDurationLabel(duration, locale),
      practitionerIds: new Set([practitionerId]),
    });
  }

  private pickCurrencyAwareFee(
    row: FilterSourceRow,
    currencyCode: 'EGP' | 'USD',
    duration: 30 | 60,
  ): number | null {
    const value =
      currencyCode === 'EGP'
        ? duration === 30
          ? row.sessionPrice30Egp
          : row.sessionPrice60Egp
        : duration === 30
          ? row.sessionPrice30Usd
          : row.sessionPrice60Usd;

    return value === null || value === undefined ? null : Number(value);
  }

  private mapPractitionerKind(practitionerType: PractitionerType): string {
    return practitionerType === PractitionerType.PSYCHIATRIST
      ? 'doctor'
      : 'therapist';
  }

  private pickLocalizedLabel(
    locale: SupportedLocale,
    arabicLikeValue: string | null | undefined,
    fallbackValue: string | null | undefined,
  ) {
    if (locale === 'ar') {
      return (
        arabicLikeValue?.trim() ||
        fallbackValue?.trim() ||
        arabicLikeValue ||
        fallbackValue ||
        ''
      );
    }

    return (
      fallbackValue?.trim() ||
      arabicLikeValue?.trim() ||
      fallbackValue ||
      arabicLikeValue ||
      ''
    );
  }

  private getPractitionerKindLabel(
    value: string,
    locale: SupportedLocale,
  ): string {
    if (locale === 'ar') {
      return value === 'doctor' ? 'طبيب نفسي' : 'معالج نفسي';
    }

    return value === 'doctor' ? 'Doctor' : 'Therapist';
  }

  private getGenderLabel(value: string, locale: SupportedLocale): string {
    if (locale === 'ar') {
      return value === 'male' ? 'ذكر' : 'أنثى';
    }

    return value === 'male' ? 'Male' : 'Female';
  }

  private getDurationLabel(
    value: 30 | 60,
    locale: SupportedLocale,
  ): string {
    if (locale === 'ar') {
      return value === 30 ? '30 دقيقة' : '60 دقيقة';
    }

    return value === 30 ? '30 minutes' : '60 minutes';
  }

  private getRatingThresholdLabel(
    value: number,
    locale: SupportedLocale,
  ): string {
    if (locale === 'ar') {
      return `${value.toFixed(1)} فأعلى`;
    }

    return `${value.toFixed(1)} and above`;
  }
}

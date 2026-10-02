import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PractitionerProfessionalContentAuthoringService } from './practitioner-professional-content-authoring.service';

describe('PractitionerProfessionalContentAuthoringService', () => {
  const service = new PractitionerProfessionalContentAuthoringService();

  it('accepts one complete authored locale without requiring the other', () => {
    const plan = service.plan(
      {},
      {
        primaryContentLocale: 'ar',
        professionalContent: {
          ar: { professionalTitle: 'CLINICAL_PSYCHOLOGIST', bio: 'نبذة عربية' },
        },
      },
    );

    expect(plan.state.primaryContentLocale).toBe('ar');
    expect(plan.state.translations).toEqual([
      {
        locale: 'ar',
        professionalTitle: 'CLINICAL_PSYCHOLOGIST',
        bio: 'نبذة عربية',
      },
    ]);
    expect(plan.legacyProjection).toEqual({
      professionalTitle: 'CLINICAL_PSYCHOLOGIST',
      bio: 'نبذة عربية',
    });
  });

  it('preserves the other locale when only one locale is edited', () => {
    const plan = service.plan(
      {
        primaryContentLocale: 'ar',
        professionalTitle: 'PSYCHOLOGIST',
        bio: 'Arabic bio',
        translations: [
          {
            locale: 'ar',
            professionalTitle: 'PSYCHOLOGIST',
            bio: 'Arabic bio',
          },
          {
            locale: 'en',
            professionalTitle: 'PSYCHOTHERAPIST',
            bio: 'English bio',
          },
        ],
      },
      { professionalContent: { ar: { bio: 'Updated Arabic bio' } } },
    );

    expect(plan.state.translations).toEqual([
      {
        locale: 'ar',
        professionalTitle: 'PSYCHOLOGIST',
        bio: 'Updated Arabic bio',
      },
      {
        locale: 'en',
        professionalTitle: 'PSYCHOTHERAPIST',
        bio: 'English bio',
      },
    ]);
    expect(plan.legacyProjection.bio).toBe('Updated Arabic bio');
  });

  it('rejects conflicting mixed legacy and localized values', () => {
    expect(() =>
      service.plan(
        { primaryContentLocale: 'en' },
        {
          professionalTitle: 'PSYCHOLOGIST',
          professionalContent: { en: { professionalTitle: 'PSYCHOTHERAPIST' } },
        },
      ),
    ).toThrow(BadRequestException);
  });

  it('allows equivalent mixed values after the existing title normalization', () => {
    const plan = service.plan(
      { primaryContentLocale: 'en' },
      {
        professionalTitle: 'clinical psychologist',
        professionalContent: {
          en: { professionalTitle: 'Clinical Psychologist' },
        },
      },
    );

    expect(plan.state.translations[0]?.professionalTitle).toBe(
      'CLINICAL_PSYCHOLOGIST',
    );
  });

  it('rejects unresolved mixed payloads instead of guessing a locale', () => {
    try {
      service.plan(
        {},
        {
          professionalTitle: 'PSYCHOLOGIST',
          professionalContent: { en: { bio: 'English bio' } },
        },
      );
      throw new Error('expected locale error');
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toMatchObject({
        error: 'PRACTITIONER_PROFESSIONAL_CONTENT_LOCALE_REQUIRED',
      });
    }
  });

  it('normalizes whitespace-only localized values as missing', () => {
    const plan = service.plan(
      {},
      {
        primaryContentLocale: 'en',
        professionalContent: {
          en: { professionalTitle: '  ', bio: '  English bio  ' },
        },
      },
    );

    expect(plan.state.translations).toEqual([
      { locale: 'en', professionalTitle: null, bio: 'English bio' },
    ]);
  });

  it('writes a versioned localized snapshot and keeps legacy snapshots readable', () => {
    const plan = service.plan(
      {},
      {
        primaryContentLocale: 'en',
        professionalContent: {
          en: { professionalTitle: 'PSYCHOLOGIST', bio: 'English bio' },
        },
      },
    );
    const localized = {
      profile: { professionalContent: service.toSnapshot(plan) },
    };

    expect(service.readSnapshot(localized)).toEqual({
      primaryContentLocale: 'en',
      locales: {
        en: { professionalTitle: 'PSYCHOLOGIST', bio: 'English bio' },
      },
    });
    expect(
      service.readSnapshot({
        profile: { professionalTitle: 'PSYCHOLOGIST', bio: 'Legacy bio' },
      }),
    ).toBeNull();
  });

  it('applies a localized approved snapshot through the supplied transaction', async () => {
    const translation = {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    };
    const profile = { update: jest.fn() };
    const tx = {
      practitionerProfileTranslation: translation,
      practitionerProfile: profile,
    } as unknown as Prisma.TransactionClient;

    await service.applySnapshot(tx, 'profile-1', {
      profile: {
        professionalTitle: 'PSYCHOLOGIST',
        bio: 'English bio',
        professionalContent: {
          version: 1,
          primaryContentLocale: 'en',
          locales: {
            ar: { professionalTitle: 'PSYCHOLOGIST', bio: 'Arabic bio' },
            en: { professionalTitle: 'PSYCHOLOGIST', bio: 'English bio' },
          },
        },
      },
    });

    expect(translation.deleteMany).toHaveBeenCalledWith({
      where: { practitionerProfileId: 'profile-1' },
    });
    expect(translation.createMany).toHaveBeenCalled();
    expect(profile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'profile-1' } }),
    );
  });
});

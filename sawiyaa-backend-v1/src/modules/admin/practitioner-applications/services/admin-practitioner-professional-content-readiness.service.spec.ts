import { PractitionerProfessionalContentAuthoringService } from '@modules/practitioners/services/practitioner-professional-content-authoring.service';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';
import { AdminPractitionerProfessionalContentReadinessService } from './admin-practitioner-professional-content-readiness.service';

describe('AdminPractitionerProfessionalContentReadinessService', () => {
  const service = new AdminPractitionerProfessionalContentReadinessService(
    new PractitionerProfessionalContentResolver(),
    new PractitionerProfessionalContentAuthoringService(),
  );

  it('derives partial-locale and fallback readiness without persisting flags', () => {
    const view = service.fromLive({
      primaryContentLocale: 'ar',
      professionalContentTranslations: [
        { locale: 'ar', professionalTitle: 'معالج', bio: null },
        { locale: 'en', professionalTitle: 'Therapist', bio: 'About' },
      ],
    });

    expect(view.readiness.locales.ar).toMatchObject({
      titleComplete: true,
      bioComplete: false,
      complete: false,
    });
    expect(view.readiness.locales.en.complete).toBe(true);
    expect(view.readiness.bilingualComplete).toBe(false);
    expect(view.readiness.fallbackActive).toBe(true);
    expect(view.readiness.sourceLocaleUnresolved).toBe(false);
  });

  it('distinguishes English-only, bilingual, and blank content readiness', () => {
    const englishOnly = service.fromLive({
      primaryContentLocale: 'en',
      professionalContentTranslations: [
        { locale: 'en', professionalTitle: 'Therapist', bio: 'About' },
      ],
    });
    expect(englishOnly.readiness.locales.ar.complete).toBe(false);
    expect(englishOnly.readiness.locales.en.complete).toBe(true);
    expect(englishOnly.readiness.bilingualComplete).toBe(false);
    expect(englishOnly.readiness.fallbackActive).toBe(true);

    const bilingual = service.fromLive({
      primaryContentLocale: 'en',
      professionalContentTranslations: [
        { locale: 'ar', professionalTitle: 'معالج', bio: 'نبذة' },
        { locale: 'en', professionalTitle: 'Therapist', bio: 'About' },
      ],
    });
    expect(bilingual.readiness.bilingualComplete).toBe(true);
    expect(bilingual.readiness.fallbackActive).toBe(false);

    const blank = service.fromLive({
      displayName: 'Excluded from professional content',
      professionalTitle: '   ',
      bio: '\n',
    } as Parameters<typeof service.fromLive>[0]);
    expect(blank.readiness.locales.ar.complete).toBe(false);
    expect(blank.readiness.locales.en.complete).toBe(false);
    expect(blank.readiness.bilingualComplete).toBe(false);
    expect(blank.readiness.fallbackActive).toBe(false);
  });

  it('does not assign legacy-only content to Arabic or English', () => {
    const view = service.fromSnapshot({
      professionalTitle: 'Legacy title',
      bio: 'Legacy bio',
    });

    expect(view.legacySnapshot).toBe(true);
    expect(view.legacyContent).toEqual({
      professionalTitle: 'Legacy title',
      bio: 'Legacy bio',
    });
    expect(view.readiness.primaryContentLocale).toBeNull();
    expect(view.readiness.locales.ar.professionalTitle).toBeNull();
    expect(view.readiness.locales.en.bio).toBeNull();
    expect(view.readiness.sourceLocaleUnresolved).toBe(true);
  });

  it('renders versioned proposed content and exposes human-reviewable field changes', () => {
    const current = {
      primaryContentLocale: 'ar' as const,
      professionalContentTranslations: [
        { locale: 'ar' as const, professionalTitle: 'معالج', bio: 'نبذة' },
      ],
    };
    const proposed = service.fromSnapshot({
      professionalTitle: 'Therapist',
      bio: 'About',
      professionalContent: {
        version: 1,
        primaryContentLocale: 'en',
        locales: {
          ar: { professionalTitle: 'معالج', bio: 'نبذة' },
          en: { professionalTitle: 'Therapist', bio: 'About' },
        },
      },
    });

    const review = service.buildReview(current, proposed);

    expect(review.proposed.readiness.locales.en.complete).toBe(true);
    expect(review.proposed.readiness.primaryContentLocale).toBe('en');
    expect(review.changedFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'professionalContent.en.professionalTitle',
          status: 'ADDED',
        }),
        expect.objectContaining({
          path: 'professionalContent.en.bio',
          status: 'ADDED',
        }),
        expect.objectContaining({
          path: 'primaryContentLocale',
          status: 'MODIFIED',
        }),
      ]),
    );
  });
});

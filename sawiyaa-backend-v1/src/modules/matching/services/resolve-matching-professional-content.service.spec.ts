import { PractitionerProfessionalContentRepository } from '@modules/practitioners/repositories/practitioner-professional-content.repository';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';
import { ResolveMatchingProfessionalContentService } from './resolve-matching-professional-content.service';

describe('ResolveMatchingProfessionalContentService', () => {
  it('batch-resolves live content and keeps missing-row ids safe', async () => {
    const findByPractitionerProfileIds = jest.fn().mockResolvedValue([
      {
        id: 'p1',
        primaryContentLocale: 'en',
        professionalTitle: 'Legacy title',
        bio: 'Legacy bio',
        professionalContentTranslations: [
          { locale: 'ar', professionalTitle: 'اختصاصي', bio: null },
          { locale: 'en', professionalTitle: 'Specialist', bio: null },
        ],
      },
    ]);
    const repository = {
      findByPractitionerProfileIds,
    } as unknown as PractitionerProfessionalContentRepository;
    const service = new ResolveMatchingProfessionalContentService(
      repository,
      new PractitionerProfessionalContentResolver(),
    );

    const result = await service.resolveTitles({
      practitionerProfileIds: ['p1', 'p1', 'legacy-without-row'],
      requestedLocale: 'ar',
    });

    expect(findByPractitionerProfileIds).toHaveBeenCalledWith([
      'p1',
      'legacy-without-row',
    ]);
    expect(result.get('p1')).toBe('اختصاصي');
    expect(result.get('legacy-without-row')).toBeNull();
  });
});

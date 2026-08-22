import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { PractitionerProfessionalContentRepository } from '@modules/practitioners/repositories/practitioner-professional-content.repository';
import { PractitionerProfessionalContentResolver } from '@modules/practitioners/services/practitioner-professional-content-resolver.service';

/**
 * Resolves the existing matching-card professional title in one read batch.
 * Matching decisions remain persisted independently from this presentation map.
 */
@Injectable()
export class ResolveMatchingProfessionalContentService {
  constructor(
    private readonly professionalContentRepository: PractitionerProfessionalContentRepository,
    private readonly professionalContentResolver: PractitionerProfessionalContentResolver,
  ) {}

  async resolveTitles(input: {
    practitionerProfileIds: string[];
    requestedLocale: SupportedLocale;
  }): Promise<ReadonlyMap<string, string | null>> {
    const uniqueIds = Array.from(new Set(input.practitionerProfileIds));
    const records =
      await this.professionalContentRepository.findByPractitionerProfileIds(
        uniqueIds,
      );
    const recordsById = new Map(records.map((record) => [record.id, record]));

    return new Map(
      uniqueIds.map((id) => {
        const record = recordsById.get(id);
        if (!record) {
          return [id, null] as const;
        }

        const resolved = this.professionalContentResolver.resolve({
          requestedLocale: input.requestedLocale,
          primaryContentLocale: record.primaryContentLocale,
          translations: record.professionalContentTranslations,
          legacyProfessionalTitle: record.professionalTitle,
          legacyBio: record.bio,
        });

        return [id, resolved.professionalTitle] as const;
      }),
    );
  }
}

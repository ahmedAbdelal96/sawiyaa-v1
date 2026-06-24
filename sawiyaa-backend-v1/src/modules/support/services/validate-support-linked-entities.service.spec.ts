import { BadRequestException } from '@nestjs/common';
import { SupportRelatedEntityRepository } from '../repositories/support-related-entity.repository';
import { ValidateSupportLinkedEntitiesService } from './validate-support-linked-entities.service';

describe('ValidateSupportLinkedEntitiesService', () => {
  it('rejects practitioner linking matching/assessment entities', async () => {
    const repository = {} as SupportRelatedEntityRepository;
    const service = new ValidateSupportLinkedEntitiesService(repository);

    await expect(
      service.validate({
        actorKind: 'PRACTITIONER',
        practitionerProfileId: 'prac-1',
        relatedMatchingSessionId: 'match-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

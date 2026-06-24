import { Injectable } from '@nestjs/common';
import { PractitionerMarketingPlacementManagementService } from '@modules/marketing-practitioner-placements/services/practitioner-marketing-placement-management.service';

@Injectable()
export class GetFeaturedPractitionerPlacementHistoryUseCase {
  constructor(
    private readonly managementService: PractitionerMarketingPlacementManagementService,
  ) {}

  async execute(placementId: string) {
    const history = await this.managementService.getHistory(placementId);
    return history.map((item) => ({
      id: item.id,
      action: item.action,
      actor: item.actorUser
        ? {
            id: item.actorUser.id,
            displayName: item.actorUser.displayName,
          }
        : null,
      beforeSnapshot: item.beforeSnapshot,
      afterSnapshot: item.afterSnapshot,
      note: item.note,
      createdAt: item.createdAt.toISOString(),
    }));
  }
}


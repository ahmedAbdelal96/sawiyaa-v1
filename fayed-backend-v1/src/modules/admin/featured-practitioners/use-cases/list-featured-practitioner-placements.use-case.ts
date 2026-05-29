import { Injectable } from '@nestjs/common';
import { PractitionerMarketingPlacementManagementService } from '@modules/marketing-practitioner-placements/services/practitioner-marketing-placement-management.service';
import { ListFeaturedPractitionersPlacementsDto } from '../dto/featured-practitioners-admin.dto';
import { presentPlacement } from './featured-practitioner-placement.presenter';

@Injectable()
export class ListFeaturedPractitionerPlacementsUseCase {
  constructor(
    private readonly managementService: PractitionerMarketingPlacementManagementService,
  ) {}

  async execute(query: ListFeaturedPractitionersPlacementsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.managementService.list({
      status: query.status,
      surface: query.surface,
      reason: query.reason,
      practitionerSearch: query.practitionerSearch,
      startsFrom: query.startsFrom ? new Date(query.startsFrom) : undefined,
      endsTo: query.endsTo ? new Date(query.endsTo) : undefined,
      page,
      limit,
    });

    return {
      items: items.map((item) => presentPlacement(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}


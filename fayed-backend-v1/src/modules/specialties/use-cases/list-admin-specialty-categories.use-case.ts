import { Injectable } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyCategoryRepository } from '../repositories/specialty-category.repository';

/**
 * Admin read use case for specialty categories.
 * Returns active and inactive categories for management and reactivation flows.
 */
@Injectable()
export class ListAdminSpecialtyCategoriesUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly specialtyCategoryRepository: SpecialtyCategoryRepository,
  ) {}

  async execute(input: { locale: SupportedLocale; q?: string }) {
    const categories = await this.specialtyCategoryRepository.listForAdmin(input.q);

    return {
      message: this.i18nService.t(
        'specialties.success.categoriesFetched',
        input.locale,
      ),
      categories,
    };
  }
}


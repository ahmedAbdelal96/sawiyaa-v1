import { Injectable } from '@nestjs/common';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { SpecialtyCategoryRepository } from '../repositories/specialty-category.repository';

/**
 * Lists active practitioner specialty categories.
 */
@Injectable()
export class ListSpecialtyCategoriesUseCase {
  constructor(
    private readonly i18nService: I18nService,
    private readonly specialtyCategoryRepository: SpecialtyCategoryRepository,
  ) {}

  async execute(locale: SupportedLocale) {
    const categories =
      await this.specialtyCategoryRepository.listActiveCategories();

    return {
      message: this.i18nService.t(
        'specialties.success.categoriesFetched',
        locale,
      ),
      categories,
    };
  }
}

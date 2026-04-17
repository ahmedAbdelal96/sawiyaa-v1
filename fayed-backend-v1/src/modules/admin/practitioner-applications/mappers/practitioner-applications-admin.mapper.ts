import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import {
  AdminPractitionerApplicationDecisionViewModel,
  AdminPractitionerApplicationDetailsViewModel,
  AdminPractitionerApplicationListItemViewModel,
} from '../types/practitioner-applications-admin.types';

/**
 * Admin mapper keeps admin practitioner-application responses stable and explicit.
 * It prevents leaking raw prisma shapes directly to controllers.
 */
@Injectable()
export class PractitionerApplicationsAdminMapper {
  pickLocalizedTitle(
    translations: Array<{ locale: string; title: string }>,
    locale: SupportedLocale,
  ): string | null {
    return (
      translations.find((item) => item.locale === locale)?.title ??
      translations.find((item) => item.locale === 'en')?.title ??
      null
    );
  }

  toListItem(input: AdminPractitionerApplicationListItemViewModel) {
    return input;
  }

  toDetails(input: AdminPractitionerApplicationDetailsViewModel) {
    return input;
  }

  toDecision(input: AdminPractitionerApplicationDecisionViewModel) {
    return input;
  }
}

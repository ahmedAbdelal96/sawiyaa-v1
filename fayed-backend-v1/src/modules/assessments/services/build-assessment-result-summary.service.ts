import { Injectable } from '@nestjs/common';
import { AssessmentResultBand } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';

@Injectable()
export class BuildAssessmentResultSummaryService {
  build(input: {
    assessmentTitle: string;
    band: AssessmentResultBand;
    locale: SupportedLocale;
  }): string {
    if (input.locale === 'ar') {
      switch (input.band) {
        case AssessmentResultBand.LOW:
          return `تشير إجاباتك في ${input.assessmentTitle} إلى مستوى منخفض من التحدي الحالي.`;
        case AssessmentResultBand.MILD:
          return `تشير إجاباتك في ${input.assessmentTitle} إلى مستوى بسيط من التحدي الحالي.`;
        case AssessmentResultBand.MODERATE:
          return `تشير إجاباتك في ${input.assessmentTitle} إلى مستوى متوسط من التحدي الحالي.`;
        case AssessmentResultBand.HIGH:
          return `تشير إجاباتك في ${input.assessmentTitle} إلى مستوى مرتفع من التحدي الحالي.`;
        default:
          return `تشير إجاباتك في ${input.assessmentTitle} إلى حالة تحتاج متابعة داعمة.`;
      }
    }

    switch (input.band) {
      case AssessmentResultBand.LOW:
        return `Your ${input.assessmentTitle} responses suggest a low level of current difficulty.`;
      case AssessmentResultBand.MILD:
        return `Your ${input.assessmentTitle} responses suggest a mild level of current difficulty.`;
      case AssessmentResultBand.MODERATE:
        return `Your ${input.assessmentTitle} responses suggest a moderate level of current difficulty.`;
      case AssessmentResultBand.HIGH:
        return `Your ${input.assessmentTitle} responses suggest a high level of current difficulty.`;
      default:
        return `Your ${input.assessmentTitle} responses indicate a pattern worth supportive follow-up.`;
    }
  }
}

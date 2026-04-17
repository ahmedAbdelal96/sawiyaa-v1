import { Injectable } from '@nestjs/common';
import { AssessmentResultBand } from '@prisma/client';
import { SupportedLocale } from '@common/i18n/types/locale.types';

@Injectable()
export class BuildAssessmentNextStepService {
  build(input: {
    band: AssessmentResultBand;
    locale: SupportedLocale;
  }): string[] {
    const sharedNextSteps =
      input.locale === 'ar'
        ? [
            'يمكنك استخدام المطابقة الموجهة للعثور على مختص مناسب لك.',
            'إذا رغبت، احجز جلسة أولية لمناقشة الخطوات التالية.',
          ]
        : [
            'You can use guided matching to find a suitable practitioner.',
            'If helpful, book an initial consultation to discuss next steps.',
          ];

    if (input.band === AssessmentResultBand.HIGH) {
      return input.locale === 'ar'
        ? [
            'فكّر في التواصل قريبًا مع مختص صحة نفسية مؤهل للحصول على دعم شخصي.',
            ...sharedNextSteps,
          ]
        : [
            'Consider speaking soon with a qualified mental health professional for personalized support.',
            ...sharedNextSteps,
          ];
    }

    if (input.band === AssessmentResultBand.MODERATE) {
      return input.locale === 'ar'
        ? [
            'قد يفيدك التحدث مع مختص لفهم وضعك الحالي بشكل أعمق.',
            ...sharedNextSteps,
          ]
        : [
            'It may help to talk with a professional to explore your current state in more depth.',
            ...sharedNextSteps,
          ];
    }

    return sharedNextSteps;
  }
}

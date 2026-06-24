import { METHOD_METADATA } from '@nestjs/common/constants';
import { PatientHomeController } from './patient-home.controller';
import { GetMyPatientHomeUseCase } from '../use-cases/get-my-patient-home.use-case';
import { TrackPatientPractitionerViewUseCase } from '../use-cases/track-patient-practitioner-view.use-case';

describe('PatientHomeController (contract)', () => {
  it('keeps GET /patients/me/home response shape stable', async () => {
    const getUseCase = {
      execute: jest.fn().mockResolvedValue({
        featuredPractitioners: {
          label: 'مختصين مميزين',
          status: 'IMPLEMENTED',
          items: [],
        },
        recentlyVisitedPractitioners: {
          label: 'مختصين زرتهم',
          status: 'READY',
          items: [],
        },
        mostBookedTodayPractitioners: {
          label: 'الأكثر حجزًا اليوم',
          status: 'IMPLEMENTED',
          items: [],
        },
        topRatedPractitioners: {
          label: 'الأعلى تقييمًا',
          status: 'IMPLEMENTED',
          items: [],
        },
        matchingCard: {
          label: 'خلّينا نساعدك تختار',
          title: 'خلّينا نساعدك تختار',
          description: 'جاوب على كام سؤال ونرشح لك مختصين مناسبين.',
          ctaKey: 'MATCHING_INTRO',
        },
        supportCard: {
          label: 'تحتاج مساعدة؟',
          title: 'تحتاج مساعدة؟',
          description: 'فريق الدعم هنا لمساعدتك.',
          ctaKey: 'SUPPORT_HOME',
        },
      }),
    } as unknown as GetMyPatientHomeUseCase;

    const trackUseCase = {
      execute: jest.fn(),
    } as unknown as TrackPatientPractitionerViewUseCase;

    const controller = new PatientHomeController(getUseCase, trackUseCase);
    const response = await controller.getHome(
      { id: 'patient-user-1', roles: ['PATIENT'] } as never,
      'ar',
    );

    expect(response.success).toBe(true);
    expect(response.data.featuredPractitioners).toBeDefined();
    expect(response.data.recentlyVisitedPractitioners).toBeDefined();
    expect(response.data.matchingCard.ctaKey).toBe('MATCHING_INTRO');
    expect(response.data.supportCard.ctaKey).toBe('SUPPORT_HOME');

    const httpMethod = Reflect.getMetadata(
      METHOD_METADATA,
      PatientHomeController.prototype.getHome,
    );
    expect(httpMethod).toBe(0);
  });

  it('keeps POST /patients/me/practitioner-views/:slug contract stable', async () => {
    const getUseCase = {
      execute: jest.fn(),
    } as unknown as GetMyPatientHomeUseCase;

    const trackUseCase = {
      execute: jest.fn().mockResolvedValue({
        slug: 'dr-hassan',
        trackedAt: '2026-05-26T12:00:00.000Z',
      }),
    } as unknown as TrackPatientPractitionerViewUseCase;

    const controller = new PatientHomeController(getUseCase, trackUseCase);
    const response = await controller.trackPractitionerView(
      { id: 'patient-user-1', roles: ['PATIENT'] } as never,
      'ar',
      'dr-hassan',
    );

    expect(response.success).toBe(true);
    expect(response.data.slug).toBe('dr-hassan');
    expect(response.data.trackedAt).toBe('2026-05-26T12:00:00.000Z');

    const httpMethod = Reflect.getMetadata(
      METHOD_METADATA,
      PatientHomeController.prototype.trackPractitionerView,
    );
    expect(httpMethod).toBe(1);
  });
});

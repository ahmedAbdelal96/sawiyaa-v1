import { METHOD_METADATA } from '@nestjs/common/constants';
import {
  InstantBookingRequestStatus,
  SessionStatus,
  SupportTicketStatus,
  SupportTicketType,
} from '@prisma/client';
import { PATIENT_JOURNEY_NEXT_STEP_VALUES } from '../types/patient-journey.types';
import { PatientJourneyController } from './patient-journey.controller';
import { GetMyPatientJourneyUseCase } from '../use-cases/get-my-patient-journey.use-case';

describe('PatientJourneyController (contract)', () => {
  it('keeps GET /patients/me/journey contract stable', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue({
        item: {
          summary: {
            hasUpcomingSession: true,
            nextSessionAt: '2026-04-02T18:00:00.000Z',
            hasPendingPayment: true,
            hasOpenSupportTicket: true,
            lastAssessmentTakenAt: '2026-03-28T14:00:00.000Z',
            lastMatchingAt: '2026-03-27T10:00:00.000Z',
            suggestedNextAction: 'COMPLETE_PAYMENT',
          },
          upcoming: {
            session: {
              id: 'session_123',
              status: SessionStatus.UPCOMING,
              scheduledStartAt: '2026-04-02T18:00:00.000Z',
              scheduledEndAt: '2026-04-02T18:30:00.000Z',
              practitioner: {
                slug: 'dr-example',
                displayName: 'Dr Example',
              },
            },
            pendingPayment: {
              id: 'payment_123',
              status: 'PENDING',
              amount: '1200.00',
              currency: 'EGP',
              sessionId: 'session_123',
              createdAt: '2026-04-01T18:00:00.000Z',
            },
            instantBookingRequest: {
              id: 'instant_123',
              status: InstantBookingRequestStatus.PENDING,
              requestedAt: '2026-04-01T16:00:00.000Z',
              expiresAt: '2026-04-01T16:15:00.000Z',
              durationMinutes: 30,
              sessionMode: 'VIDEO',
              practitioner: {
                slug: 'dr-example',
                displayName: 'Dr Example',
              },
            },
          },
          recentHistory: {
            sessions: [],
            assessments: [],
            matching: [],
            payments: [],
          },
          support: {
            hasOpenTicket: true,
            latestOpenTicket: {
              id: 'ticket_123',
              category: SupportTicketType.PAYMENT,
              status: SupportTicketStatus.IN_PROGRESS,
              updatedAt: '2026-04-01T15:00:00.000Z',
            },
          },
          linkedContent: [],
          nextSteps: [
            {
              type: 'COMPLETE_PAYMENT',
              label: 'Complete your pending payment',
            },
          ],
        },
      }),
    } as unknown as GetMyPatientJourneyUseCase;

    const controller = new PatientJourneyController(useCase);
    const response = await controller.getJourney({
      id: 'patient-user-1',
      roles: ['PATIENT'],
    } as never);

    expect(response.success).toBe(true);
    expect(response.data.item.summary).toBeDefined();
    expect(response.data.item.upcoming).toBeDefined();
    expect(response.data.item.recentHistory).toBeDefined();
    expect(response.data.item.support).toBeDefined();
    expect(Array.isArray(response.data.item.linkedContent)).toBe(true);
    expect(Array.isArray(response.data.item.nextSteps)).toBe(true);

    expect(PATIENT_JOURNEY_NEXT_STEP_VALUES).toContain(
      response.data.item.summary.suggestedNextAction,
    );
    for (const step of response.data.item.nextSteps) {
      expect(PATIENT_JOURNEY_NEXT_STEP_VALUES).toContain(step.type);
    }
    expect(Object.values(InstantBookingRequestStatus)).toContain(
      response.data.item.upcoming.instantBookingRequest?.status,
    );
    expect(Object.values(SupportTicketType)).toContain(
      response.data.item.support.latestOpenTicket?.category,
    );
    expect(Object.values(SupportTicketStatus)).toContain(
      response.data.item.support.latestOpenTicket?.status,
    );

    const httpMethod = Reflect.getMetadata(
      METHOD_METADATA,
      PatientJourneyController.prototype.getJourney,
    );
    expect(httpMethod).toBe(0);
  });
});

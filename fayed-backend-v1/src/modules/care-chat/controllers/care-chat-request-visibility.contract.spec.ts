import { CareChatPresenter } from '../presenters/care-chat.presenter';
import { ResolveCareChatActivityStateService } from '../services/resolve-care-chat-activity-state.service';
import { AdminCareChatController } from './admin-care-chat.controller';
import { PatientCareChatController } from './patient-care-chat.controller';
import { PractitionerCareChatController } from './practitioner-care-chat.controller';

describe('Care chat request visibility contract', () => {
  const presenter = new CareChatPresenter(
    new ResolveCareChatActivityStateService(),
  );

  const baseRequest = {
    id: 'req_1',
    status: 'PENDING' as const,
    requestReason: 'Need follow-up context',
    internalReviewNote: 'admin-only-note',
    relatedSessionId: null,
    linkedConversationId: null,
    requestedAt: new Date('2026-03-30T12:00:00.000Z'),
    reviewedAt: null,
    approvedAt: null,
    rejectedAt: null,
    expiresAt: new Date('2026-04-29T12:00:00.000Z'),
    revokedAt: null,
    patient: {
      id: 'patient_1',
      user: {
        displayName: 'Patient One',
      },
    },
    practitioner: {
      id: 'practitioner_1',
      user: {
        displayName: 'Dr One',
      },
    },
  };

  it('does not expose internalReviewNote for patient/practitioner responses, while keeping it for admin', async () => {
    const userItem = presenter.presentUserRequestItem(baseRequest);
    const adminItem = presenter.presentAdminRequestItem(baseRequest);

    const patientController = new PatientCareChatController(
      { execute: jest.fn().mockResolvedValue({ item: userItem }) } as never,
      {
        execute: jest.fn().mockResolvedValue({
          items: [userItem],
          pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
        }),
      } as never,
      { execute: jest.fn().mockResolvedValue({ item: userItem }) } as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
    );

    const practitionerController = new PractitionerCareChatController(
      {
        execute: jest.fn().mockResolvedValue({
          items: [userItem],
          pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
        }),
      } as never,
      { execute: jest.fn().mockResolvedValue({ item: userItem }) } as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
    );

    const adminController = new AdminCareChatController(
      {
        execute: jest.fn().mockResolvedValue({
          items: [adminItem],
          pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
        }),
      } as never,
      { execute: jest.fn().mockResolvedValue({ item: adminItem }) } as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
    );

    const patientResponse = await patientController.getRequestById(
      { id: 'user_patient', roles: ['PATIENT'] } as never,
      'req_1',
    );
    const practitionerResponse = await practitionerController.getRequestById(
      { id: 'user_practitioner', roles: ['PRACTITIONER'] } as never,
      'req_1',
    );
    const adminResponse = await adminController.getRequestById('req_1');

    expect(patientResponse.data.item).not.toHaveProperty('internalReviewNote');
    expect(practitionerResponse.data.item).not.toHaveProperty(
      'internalReviewNote',
    );
    expect(adminResponse.data.item).toHaveProperty(
      'internalReviewNote',
      'admin-only-note',
    );
  });
});

import { ConversationStatus } from '@prisma/client';
import { GeneralChatModerationStateService } from './general-chat-moderation-state.service';

describe('GeneralChatModerationStateService', () => {
  const service = new GeneralChatModerationStateService();

  it('marks admin-disabled conversations as not sendable', () => {
    const result = service.resolveConversationState({
      status: ConversationStatus.OPEN,
      closedAt: null,
      adminLock: {
        disabledAt: new Date('2026-05-21T10:00:00.000Z'),
        disabledByUserId: 'admin',
        disabledReason: 'Stop sending',
        enabledAt: null,
        enabledByUserId: null,
      },
      practitionerLock: {
        disabledAt: null,
        disabledByUserId: null,
        disabledReason: null,
        enabledAt: null,
        enabledByUserId: null,
      },
    });

    expect(result.status).toBe('SENDING_DISABLED');
    expect(result.canSendMessage).toBe(false);
    expect(result.closedBy).toBe('ADMIN');
  });

  it('keeps practitioner closure active even when admin lock is absent', () => {
    const result = service.resolveConversationState({
      status: ConversationStatus.OPEN,
      closedAt: null,
      adminLock: {
        disabledAt: null,
        disabledByUserId: null,
        disabledReason: null,
        enabledAt: new Date('2026-05-21T11:00:00.000Z'),
        enabledByUserId: 'admin',
      },
      practitionerLock: {
        disabledAt: new Date('2026-05-21T09:00:00.000Z'),
        disabledByUserId: 'practitioner',
        disabledReason: 'Closed by practitioner',
        enabledAt: null,
        enabledByUserId: null,
      },
    });

    expect(result.status).toBe('CLOSED_BY_PRACTITIONER');
    expect(result.canSendMessage).toBe(false);
    expect(result.closedBy).toBe('PRACTITIONER');
  });

  it('classifies message preview safely', () => {
    expect(service.resolveMessagePreviewType(null)).toBe('NO_MESSAGES');
    expect(
      service.resolveMessagePreviewType({
        contentText: 'Hello',
        attachments: [],
      }),
    ).toBe('TEXT_MESSAGE');
    expect(
      service.resolveMessagePreviewType({
        contentText: null,
        attachments: [{}],
      }),
    ).toBe('ATTACHMENT');
    expect(
      service.resolveMessagePreviewType({
        contentText: 'Hello',
        attachments: [{}],
      }),
    ).toBe('TEXT_WITH_ATTACHMENT');
  });
});

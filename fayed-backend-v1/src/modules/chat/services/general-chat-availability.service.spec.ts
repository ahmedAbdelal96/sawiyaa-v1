import { ConversationStatus, SessionMode, SessionProvider, SessionStatus } from '@prisma/client';
import { GeneralChatModerationStateService } from './general-chat-moderation-state.service';
import { GeneralChatAvailabilityService } from './general-chat-availability.service';

describe('GeneralChatAvailabilityService', () => {
  const service = new GeneralChatAvailabilityService(
    new GeneralChatModerationStateService(),
  );

  const baseConversation = {
    status: ConversationStatus.OPEN,
    closedAt: null,
    adminLock: {
      disabledAt: null,
      disabledByUserId: null,
      disabledReason: null,
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
  } as const;

  const linkedSessionBase = {
    sessionMode: SessionMode.VIDEO,
    scheduledStartAt: new Date('2026-08-02T12:00:00.000Z'),
    scheduledEndAt: new Date('2026-08-02T12:30:00.000Z'),
    provider: SessionProvider.DAILY,
    providerRoomId: 'room-1',
    providerSessionRef: 'room-ref-1',
  } as const;

  it('returns read-only availability when the linked session ended', () => {
    const result = service.resolveAvailability({
      conversation: baseConversation,
      linkedSession: {
        ...linkedSessionBase,
        status: SessionStatus.COMPLETED,
      },
      now: new Date('2026-08-02T12:30:01.000Z'),
    });

    expect(result).toEqual({
      canRead: true,
      canSend: false,
      readOnly: true,
      reason: 'SESSION_ENDED',
    });
  });

  it('keeps linked-session read-only state even if the conversation was archived', () => {
    const result = service.resolveAvailability({
      conversation: {
        ...baseConversation,
        status: ConversationStatus.CLOSED,
      },
      linkedSession: {
        ...linkedSessionBase,
        status: SessionStatus.COMPLETED,
      },
      now: new Date('2026-08-02T12:30:01.000Z'),
    });

    expect(result).toEqual({
      canRead: true,
      canSend: false,
      readOnly: true,
      reason: 'SESSION_ENDED',
    });
  });

  it('returns moderation locked when admin sending is disabled', () => {
    const result = service.resolveAvailability({
      conversation: {
        ...baseConversation,
        adminLock: {
          disabledAt: new Date('2026-08-02T10:00:00.000Z'),
          disabledByUserId: 'admin',
          disabledReason: 'lock',
          enabledAt: null,
          enabledByUserId: null,
        },
      },
      linkedSession: null,
    });

    expect(result).toEqual({
      canRead: true,
      canSend: false,
      readOnly: true,
      reason: 'MODERATION_LOCKED',
    });
  });

  it('returns conversation closed for archived conversations', () => {
    const result = service.resolveAvailability({
      conversation: {
        ...baseConversation,
        status: ConversationStatus.CLOSED,
      },
      linkedSession: null,
    });

    expect(result).toEqual({
      canRead: true,
      canSend: false,
      readOnly: true,
      reason: 'CONVERSATION_CLOSED',
    });
  });

  it('allows open general chat conversations', () => {
    const result = service.resolveAvailability({
      conversation: baseConversation,
      linkedSession: null,
    });

    expect(result).toEqual({
      canRead: true,
      canSend: true,
      readOnly: false,
      reason: 'ALLOWED',
    });
  });
});

import { ForbiddenException } from '@nestjs/common';
import { AppRole } from '@common/enums/app-role.enum';
import { ConversationType } from '@prisma/client';
import { MessagingPolicyRegistry } from './messaging-policy-registry';

function conversation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conversation-1',
    conversationType: ConversationType.SUPPORT,
    status: 'OPEN',
    sessionId: null,
    supportTicketId: 'ticket-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    closedAt: null,
    expiresAt: null,
    participants: [
      {
        userId: 'patient-1',
        participantRole: 'PATIENT',
        lastReadMessageId: null,
        lastReadAt: null,
      },
    ],
    messages: [],
    session: null,
    supportTicket: { status: 'OPEN', subject: 'Support issue' },
    chatApprovalRequest: null,
    ...overrides,
  } as any;
}

describe('MessagingPolicyRegistry', () => {
  const policy = new MessagingPolicyRegistry();

  it('allows authorized support staff without assignment or participant membership', () => {
    for (const agentId of ['agent-1', 'agent-2']) {
      expect(
        policy.canSend(conversation(), {
          id: agentId,
          roles: [AppRole.SUPPORT_AGENT],
        }),
      ).toEqual({ allowed: true });
    }
  });

  it('does not grant support staff access to session or care conversations', () => {
    expect(() =>
      policy.assertCanView(
        conversation({
          conversationType: ConversationType.SYSTEM,
          supportTicketId: null,
          supportTicket: null,
          sessionId: 'session-1',
          session: { status: 'IN_PROGRESS' },
        }),
        { id: 'agent-1', roles: [AppRole.SUPPORT_AGENT] },
      ),
    ).toThrow(ForbiddenException);
  });

  it('requires an approved care request before care messages can be sent', () => {
    expect(
      policy.canSend(
        conversation({
          conversationType: ConversationType.CARE_APPROVED,
          supportTicketId: null,
          supportTicket: null,
          chatApprovalRequest: { status: 'PENDING', expiresAt: null },
        }),
        { id: 'patient-1', roles: [] },
      ),
    ).toEqual({ allowed: false, reason: 'CARE_NOT_APPROVED' });
  });

  it('keeps session messaging sendable only in the active session states', () => {
    const active = conversation({
      conversationType: ConversationType.SYSTEM,
      supportTicketId: null,
      supportTicket: null,
      sessionId: 'session-1',
      session: { status: 'IN_PROGRESS' },
    });
    active.participants.push({
      userId: 'patient-1',
      participantRole: 'PATIENT',
      lastReadMessageId: null,
      lastReadAt: null,
    });
    expect(policy.canSend(active, { id: 'patient-1', roles: [] })).toEqual({
      allowed: true,
    });

    expect(
      policy.canSend(
        { ...active, session: { status: 'COMPLETED' } },
        { id: 'patient-1', roles: [] },
      ),
    ).toEqual({ allowed: false, reason: 'SESSION_NOT_SENDABLE' });
  });

  it('blocks every support sender from a resolved ticket with one canonical reason', () => {
    const resolved = conversation({
      supportTicket: { status: 'RESOLVED', subject: 'Resolved issue' },
    });
    expect(policy.canSend(resolved, { id: 'patient-1', roles: [] })).toEqual({
      allowed: false,
      reason: 'SUPPORT_TICKET_RESOLVED',
    });
    expect(policy.canSend(resolved, { id: 'agent-1', roles: [AppRole.SUPPORT_AGENT] })).toEqual({
      allowed: false,
      reason: 'SUPPORT_TICKET_RESOLVED',
    });
  });
});

import { StreamableFile } from '@nestjs/common';
import { SecurityAuditOutcome } from '@prisma/client';
import { AdminGeneralChatConversationsController } from './admin-general-chat-conversations.controller';

describe('AdminGeneralChatConversationsController', () => {
  const listAdminGeneralChatConversationsUseCase = {
    execute: jest.fn(),
  };
  const getAdminGeneralChatConversationUseCase = {
    execute: jest.fn(),
  };
  const listAdminGeneralChatMessagesUseCase = {
    execute: jest.fn(),
  };
  const streamAdminGeneralChatAttachmentUseCase = {
    execute: jest.fn(),
  };
  const disableAdminGeneralChatConversationUseCase = {
    execute: jest.fn(),
  };
  const enableAdminGeneralChatConversationUseCase = {
    execute: jest.fn(),
  };
  const securityAuditService = {
    logAsync: jest.fn(),
  };

  const controller = new AdminGeneralChatConversationsController(
    listAdminGeneralChatConversationsUseCase as never,
    getAdminGeneralChatConversationUseCase as never,
    listAdminGeneralChatMessagesUseCase as never,
    streamAdminGeneralChatAttachmentUseCase as never,
    disableAdminGeneralChatConversationUseCase as never,
    enableAdminGeneralChatConversationUseCase as never,
    securityAuditService as never,
  );

  const currentUser = {
    id: 'admin-user',
    roles: ['ADMIN'],
  } as never;

  const request = {
    headers: {
      'user-agent': 'jest',
      'x-forwarded-for': '203.0.113.10',
    },
    socket: {
      remoteAddress: '127.0.0.1',
    },
    query: {},
  } as never;

  const response = {
    setHeader: jest.fn(),
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('audits list/detail/messages reads', async () => {
    listAdminGeneralChatConversationsUseCase.execute.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    });
    getAdminGeneralChatConversationUseCase.execute.mockResolvedValue({
      item: { conversationId: 'conv_1' },
    });
    listAdminGeneralChatMessagesUseCase.execute.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
    });

    await controller.list(currentUser, request, {} as never);
    await controller.detail(currentUser, request, 'conv_1');
    await controller.listMessages(currentUser, request, 'conv_1', {
      page: 1,
      limit: 20,
    } as never);

    expect(securityAuditService.logAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'privacy.session_chat.conversation.list.admin',
        outcome: SecurityAuditOutcome.SUCCESS,
      }),
    );
    expect(securityAuditService.logAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'privacy.session_chat.conversation.read.admin',
      }),
    );
    expect(securityAuditService.logAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'privacy.session_chat.messages.read.admin',
      }),
    );
  });

  it('audits attachment reads and returns a streamable file', async () => {
    streamAdminGeneralChatAttachmentUseCase.execute.mockResolvedValue({
      file: new StreamableFile(Buffer.from('hello')),
      mimeType: 'application/pdf',
      originalFileName: 'note.pdf',
    });

    const result = await controller.streamAttachment(
      currentUser,
      request,
      'conv_1',
      'file_1',
      response,
    );

    expect(result).toBeInstanceOf(StreamableFile);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'inline; filename="note.pdf"',
    );
    expect(securityAuditService.logAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'privacy.session_chat.attachment.read.admin',
      }),
    );
  });

  it('audits disable/enable actions with reason and note metadata', async () => {
    disableAdminGeneralChatConversationUseCase.execute.mockResolvedValue({
      updatedAt: new Date('2026-05-21T10:00:00.000Z'),
    });
    enableAdminGeneralChatConversationUseCase.execute.mockResolvedValue({
      updatedAt: new Date('2026-05-21T11:00:00.000Z'),
    });

    await controller.disable(currentUser, request, 'conv_1', {
      reason: 'Moderation reason',
      note: 'Admin note',
    });
    await controller.enable(currentUser, request, 'conv_1', {
      note: 'Re-enable note',
    });

    expect(securityAuditService.logAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'privacy.session_chat.conversation.disable.admin',
        reason: 'Moderation reason',
      }),
    );
    expect(securityAuditService.logAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'privacy.session_chat.conversation.enable.admin',
      }),
    );
  });
});

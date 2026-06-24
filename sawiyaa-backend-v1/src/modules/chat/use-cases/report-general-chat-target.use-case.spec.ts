import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
} from '@prisma/client';
import { CreateModerationReportUseCase } from '@modules/moderation/use-cases/create-moderation-report.use-case';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { ReportGeneralChatTargetUseCase } from './report-general-chat-target.use-case';

describe('ReportGeneralChatTargetUseCase', () => {
  const generalChatRepository = {
    findConversationByIdInGeneralScope: jest.fn(),
    findAccessibleMessageInConversationScope: jest.fn(),
  } as unknown as GeneralChatRepository;

  const createModerationReportUseCase = {
    execute: jest.fn(),
  } as unknown as CreateModerationReportUseCase;

  const useCase = new ReportGeneralChatTargetUseCase(
    generalChatRepository,
    createModerationReportUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports accessible general chat conversation by participant', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      participants: [{ userId: 'user_1' }],
    });
    (createModerationReportUseCase.execute as jest.Mock).mockResolvedValue({
      item: {
        id: 'report_1',
        targetType: ModerationReportTargetType.GENERAL_CHAT_CONVERSATION,
        targetId: 'conv_1',
        reason: ModerationReportReason.ABUSE,
        status: ModerationCaseStatus.OPEN,
        createdAt: '2026-04-01T12:00:00.000Z',
      },
    });

    const result = await useCase.reportConversation({
      authenticatedUser: { id: 'user_1', roles: [] },
      conversationId: 'conv_1',
      dto: {
        reason: ModerationReportReason.ABUSE,
      },
    });

    expect(createModerationReportUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          targetType: ModerationReportTargetType.GENERAL_CHAT_CONVERSATION,
          targetId: 'conv_1',
        }),
      }),
    );
    expect(result.item.reportId).toBe('report_1');
  });

  it('rejects conversation report for non-participant', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      participants: [{ userId: 'other_user' }],
    });

    await expect(
      useCase.reportConversation({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'conv_1',
        dto: { reason: ModerationReportReason.OTHER },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects report when message is inaccessible or missing', async () => {
    (
      generalChatRepository.findAccessibleMessageInConversationScope as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.reportMessage({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'conv_1',
        messageId: 'msg_1',
        dto: { reason: ModerationReportReason.HARASSMENT },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reports accessible general chat message', async () => {
    (
      generalChatRepository.findAccessibleMessageInConversationScope as jest.Mock
    ).mockResolvedValue({
      id: 'msg_1',
      conversationId: 'conv_1',
    });
    (createModerationReportUseCase.execute as jest.Mock).mockResolvedValue({
      item: {
        id: 'report_2',
        targetType: ModerationReportTargetType.GENERAL_CHAT_MESSAGE,
        targetId: 'msg_1',
        reason: ModerationReportReason.HARASSMENT,
        status: ModerationCaseStatus.OPEN,
        createdAt: '2026-04-01T12:05:00.000Z',
      },
    });

    const result = await useCase.reportMessage({
      authenticatedUser: { id: 'user_1', roles: [] },
      conversationId: 'conv_1',
      messageId: 'msg_1',
      dto: { reason: ModerationReportReason.HARASSMENT },
    });

    expect(createModerationReportUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          targetType: ModerationReportTargetType.GENERAL_CHAT_MESSAGE,
          targetId: 'msg_1',
        }),
      }),
    );
    expect(result.item.reportId).toBe('report_2');
  });
});

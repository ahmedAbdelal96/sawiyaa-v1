import {
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
  ModerationReporterRole,
} from '@prisma/client';
import { ModerationPresenter } from '../presenters/moderation.presenter';
import { ModerationRepository } from '../repositories/moderation.repository';
import { GetModerationCaseUseCase } from './get-moderation-case.use-case';

describe('GetModerationCaseUseCase', () => {
  const moderationRepository = {
    findCaseById: jest.fn(),
  } as unknown as ModerationRepository;
  const moderationPresenter = {
    presentCaseDetail: jest.fn(),
  } as unknown as ModerationPresenter;

  const useCase = new GetModerationCaseUseCase(
    moderationRepository,
    moderationPresenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns one case detail payload for reviewer operations', async () => {
    (moderationRepository.findCaseById as jest.Mock).mockResolvedValue({
      id: 'report_1',
      targetType: ModerationReportTargetType.SUPPORT_MESSAGE,
      targetId: 'message_1',
      reason: ModerationReportReason.SPAM,
      note: 'contains spam',
      status: ModerationCaseStatus.OPEN,
      reportedByUserId: 'user_1',
      reportedByRole: ModerationReporterRole.PATIENT,
      createdAt: new Date('2026-03-31T19:20:00.000Z'),
      lastActionAt: new Date('2026-03-31T19:25:00.000Z'),
      targetSnapshot: {
        kind: 'SUPPORT_MESSAGE',
        conversationId: 'conv_1',
        sentAt: new Date('2026-03-31T19:10:00.000Z'),
        preview: 'spam text',
      },
    });
    (moderationPresenter.presentCaseDetail as jest.Mock).mockReturnValue({
      id: 'report_1',
      reporterUserId: 'user_1',
      note: 'contains spam',
    });

    const result = await useCase.execute({ reportId: 'report_1' });
    expect(result).toEqual({
      item: {
        id: 'report_1',
        reporterUserId: 'user_1',
        note: 'contains spam',
      },
    });
  });

  it('throws not found when case id does not exist', async () => {
    (moderationRepository.findCaseById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute({ reportId: 'missing' })).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'MODERATION_REPORT_NOT_FOUND_IN_SCOPE',
      }),
    });
  });
});

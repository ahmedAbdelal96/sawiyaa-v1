import {
  ModerationCaseStatus,
  ModerationReportReason,
  ModerationReportTargetType,
  ModerationReporterRole,
} from '@prisma/client';
import { ModerationPresenter } from './moderation.presenter';

describe('ModerationPresenter', () => {
  const presenter = new ModerationPresenter();

  it('returns curated detail payload without internal-only fields', () => {
    const item = presenter.presentCaseDetail({
      id: 'report_1',
      targetType: ModerationReportTargetType.SUPPORT_MESSAGE,
      targetId: 'message_1',
      reason: ModerationReportReason.ABUSE,
      note: 'note',
      status: ModerationCaseStatus.OPEN,
      reportedByUserId: 'user_1',
      reportedByRole: ModerationReporterRole.PATIENT,
      createdAt: new Date('2026-03-31T20:00:00.000Z'),
      lastActionAt: null,
      targetSnapshot: {
        kind: 'SUPPORT_MESSAGE',
        conversationId: 'conv_1',
        sentAt: new Date('2026-03-31T19:55:00.000Z'),
        preview: 'message preview',
      },
    });

    expect(item).toMatchObject({
      id: 'report_1',
      targetType: ModerationReportTargetType.SUPPORT_MESSAGE,
      reporterRole: ModerationReporterRole.PATIENT,
      reporterUserId: 'user_1',
      note: 'note',
      targetSnapshot: {
        kind: 'SUPPORT_MESSAGE',
        context: {
          conversationId: 'conv_1',
          preview: 'message preview',
        },
      },
    });
    expect(item).not.toHaveProperty('auditEvents');
    expect(item).not.toHaveProperty('reportedByUser');
  });
});

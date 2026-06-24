import { ChatApprovalStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { CareChatRequestRepository } from './care-chat-request.repository';

describe('CareChatRequestRepository', () => {
  it('expires only pending requests that are already due', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 4 });
    const prisma = {
      chatApprovalRequest: {
        updateMany,
      },
    } as unknown as PrismaService;

    const repository = new CareChatRequestRepository(prisma);
    const now = new Date('2026-06-22T10:00:00.000Z');

    await repository.expirePendingDueRequests({ now });

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        status: ChatApprovalStatus.PENDING,
        expiresAt: {
          lte: now,
        },
      },
      data: {
        status: ChatApprovalStatus.EXPIRED,
      },
    });
  });
});

import { PrismaService } from '@common/prisma/prisma.service';
import { AdminGeneralChatRepository } from './admin-general-chat.repository';

describe('AdminGeneralChatRepository', () => {
  const prisma = {
    $queryRaw: jest.fn(),
  } as unknown as PrismaService;

  const repository = new AdminGeneralChatRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('casts conversation ids to text in the stats query to avoid uuid/text comparison failures', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      {
        conversationId: '5b0d03d2-97a8-4f17-9c88-8f4e4d1ccf7a',
        messagesCount: 3,
        attachmentsCount: 1,
      },
    ]);

    const stats = await repository.getConversationStats([
      '5b0d03d2-97a8-4f17-9c88-8f4e4d1ccf7a',
      '5b0d03d2-97a8-4f17-9c88-8f4e4d1ccf7a',
    ]);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const sql = (prisma.$queryRaw as jest.Mock).mock.calls[0][0] as {
      strings?: string[];
      values?: unknown[];
    };
    expect(sql.strings?.join('')).toContain('m."conversationId"::text in (');
    expect(sql.strings?.join('')).toContain('m."visibility"::text =');
    expect(sql.values?.length).toBeGreaterThan(0);
    expect(stats.get('5b0d03d2-97a8-4f17-9c88-8f4e4d1ccf7a')).toEqual({
      messagesCount: 3,
      attachmentsCount: 1,
    });
  });

  it('returns an empty map when no conversation ids are provided', async () => {
    const stats = await repository.getConversationStats([]);

    expect(stats.size).toBe(0);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});

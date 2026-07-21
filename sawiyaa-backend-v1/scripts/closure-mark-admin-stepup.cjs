const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const admin = await prisma.user.findFirst({ where: { emails: { some: { email: 'admin@hesba.local' } } }, select: { id: true } });
  const now = new Date();
  const result = await prisma.userSession.updateMany({
    where: { userId: admin.id, revokedAt: null },
    data: { stepUpVerifiedAt: now, stepUpExpiresAt: new Date(now.getTime() + 10 * 60 * 1000) },
  });
  console.log(JSON.stringify({ sessionsMarked: result.count }));
})().finally(() => prisma.$disconnect());

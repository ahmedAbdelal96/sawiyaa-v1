import 'dotenv/config';
import { ConfigCategory, ConfigChangeAction, ConfigDataType, ConfigKind, ConfigScopeType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const key = 'payment.routing.currencyRoutes';
const routes = [
  { currencyCode: 'EGP', paymentMethod: 'CARD', provider: 'PAYMOB', integrationKey: 'paymob-egp-card', environment: 'development', enabled: true, priority: 100 },
  { currencyCode: 'USD', paymentMethod: 'CARD', provider: 'PAYMOB', integrationKey: 'paymob-usd-card', environment: 'development', enabled: true, priority: 100 },
];

async function main() {
  if ((process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development') === 'production') {
    throw new Error('Refusing to bootstrap payment routes in production.');
  }
  const catalog = await prisma.configKeyCatalog.upsert({
    where: { key },
    create: {
      key,
      slug: 'payment-routing-currency-routes',
      displayName: 'Payment Routing Currency Routes',
      description: 'Database-only currency and payment-method provider routes.',
      configKind: ConfigKind.SETTING,
      dataType: ConfigDataType.JSON,
      category: ConfigCategory.PAYMENT,
      isSensitive: false,
      isRequired: false,
      supportsOverride: true,
    },
    update: {},
  });
  const existing = await prisma.configValue.findFirst({
    where: { configKeyId: catalog.id, scopeType: ConfigScopeType.GLOBAL, scopeRefId: null, isActive: true },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
  });
  if (existing) {
    console.log('Payment route bootstrap skipped: an active database routing record already exists.');
    return;
  }
  await prisma.$transaction(async (tx) => {
    const value = await tx.configValue.create({
      data: { configKeyId: catalog.id, scopeType: ConfigScopeType.GLOBAL, valueJson: routes, priority: 0, isActive: true },
    });
    await tx.configChangeLog.create({
      data: { configKeyId: catalog.id, configValueId: value.id, changeAction: ConfigChangeAction.CREATED, newValueSnapshot: routes, reason: 'Manual development bootstrap for database-only payment routing.' },
    });
  });
  console.log('Created the initial development EGP and USD database payment routes.');
}
main().finally(() => prisma.$disconnect());

import 'dotenv/config';
import {
  ConfigChangeAction,
  ConfigScopeType,
  PrismaClient,
} from '@prisma/client';

const prisma = new PrismaClient();
const key = 'payment.routing.currencyRoutes';
const productionRoute = {
  currencyCode: 'EGP',
  paymentMethod: 'CARD',
  provider: 'PAYMOB',
  integrationKey: 'paymob-egp-card',
  environment: 'production',
  enabled: true,
  priority: 100,
};

function sameRoute(value: unknown): boolean {
  return JSON.stringify(value) === JSON.stringify(productionRoute);
}

async function main(): Promise<void> {
  if (process.env.ALLOW_PAYMENT_ROUTE_BOOTSTRAP !== 'true') {
    throw new Error(
      'Refusing payment route bootstrap. Set ALLOW_PAYMENT_ROUTE_BOOTSTRAP=true for an explicit operator run.',
    );
  }

  const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development';
  if (appEnv !== 'production' && appEnv !== 'staging') {
    throw new Error('This operator script is limited to production or staging environments.');
  }

  const catalog = await prisma.configKeyCatalog.findUnique({ where: { key } });
  if (!catalog) throw new Error(`Missing ConfigKeyCatalog entry: ${key}`);

  const active = await prisma.configValue.findMany({
    where: {
      configKeyId: catalog.id,
      scopeType: ConfigScopeType.GLOBAL,
      scopeRefId: null,
      isActive: true,
    },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
  });

  if (active.length > 1) {
    throw new Error(`Refusing bootstrap: ${active.length} active routing records already exist.`);
  }

  if (active.length === 1) {
    const routes = Array.isArray(active[0].valueJson) ? active[0].valueJson : [];
    if (routes.length === 1 && sameRoute(routes[0])) {
      console.log('Payment route bootstrap already satisfied; no changes made.');
      return;
    }
    throw new Error('Refusing bootstrap: an existing active routing record conflicts with the EGP-only target.');
  }

  await prisma.$transaction(async (tx) => {
    const value = await tx.configValue.create({
      data: {
        configKeyId: catalog.id,
        scopeType: ConfigScopeType.GLOBAL,
        valueJson: [productionRoute],
        priority: 0,
        isActive: true,
      },
    });
    await tx.configChangeLog.create({
      data: {
        configKeyId: catalog.id,
        configValueId: value.id,
        changeAction: ConfigChangeAction.CREATED,
        newValueSnapshot: [productionRoute],
        reason: 'Explicit operator bootstrap of the production EGP payment route.',
      },
    });
  });
  console.log('Created one production EGP payment route. No USD route was created.');
}

main().finally(() => prisma.$disconnect());

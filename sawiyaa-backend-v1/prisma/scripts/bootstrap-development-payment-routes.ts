import 'dotenv/config';
import { ConfigScopeType, PrismaClient } from '@prisma/client';
import type { PrismaService } from '../../src/common/prisma/prisma.service';
import { CONFIG_KEYS } from '../../src/modules/config/registry/config-key.constants';
import { ConfigurationAuthorizationService } from '../../src/modules/config/services/configuration-authorization.service';
import { ConfigurationManagementService } from '../../src/modules/config/services/configuration-management.service';

const prisma = new PrismaClient();
const key = CONFIG_KEYS.payment.routing.currencyRoutes;
const routes = [
  {
    currencyCode: 'EGP',
    paymentMethod: 'CARD',
    provider: 'PAYMOB',
    integrationKey: 'paymob-egp-card',
    environment: 'development',
    enabled: true,
    priority: 100,
  },
  {
    currencyCode: 'USD',
    paymentMethod: 'CARD',
    provider: 'PAYMOB',
    integrationKey: 'paymob-usd-card',
    environment: 'development',
    enabled: true,
    priority: 100,
  },
];

async function main(): Promise<void> {
  if (
    (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development') ===
    'production'
  ) {
    throw new Error('Refusing to bootstrap payment routes in production.');
  }

  const catalog = await prisma.configKeyCatalog.findUnique({ where: { key } });
  if (!catalog) throw new Error(`Missing ConfigKeyCatalog entry: ${key}`);

  const existing = await prisma.configValue.findFirst({
    where: {
      configKeyId: catalog.id,
      scopeType: ConfigScopeType.GLOBAL,
      scopeRefId: null,
      isActive: true,
    },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
  });
  if (existing) {
    console.log(
      'Payment route bootstrap skipped: an active database routing record already exists.',
    );
    return;
  }

  const management = new ConfigurationManagementService(
    prisma as unknown as PrismaService,
    new ConfigurationAuthorizationService(),
  );
  await management.update({
    key,
    value: routes,
    scopeType: ConfigScopeType.GLOBAL,
    scopeRefId: null,
    actorType: 'SYSTEM',
    actor: { type: 'SYSTEM', permissions: ['configuration.system.write'] },
    reason: 'Manual development bootstrap for database-only payment routing.',
    expectedUpdatedAt: null,
  });
  console.log(
    'Created the initial development EGP and USD database payment routes.',
  );
}

void main().finally(() => prisma.$disconnect());

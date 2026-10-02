import 'dotenv/config';
import { ConfigScopeType, PrismaClient } from '@prisma/client';
import type { PrismaService } from '../../src/common/prisma/prisma.service';
import { CONFIG_KEYS } from '../../src/modules/config/registry/config-key.constants';
import { ConfigurationAuthorizationService } from '../../src/modules/config/services/configuration-authorization.service';
import { ConfigurationManagementService } from '../../src/modules/config/services/configuration-management.service';

const prisma = new PrismaClient();
const key = CONFIG_KEYS.payment.routing.currencyRoutes;
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
  if (!value || typeof value !== 'object') return false;
  const route = value as Record<string, unknown>;
  return (
    route.currencyCode === productionRoute.currencyCode &&
    route.paymentMethod === productionRoute.paymentMethod &&
    route.provider === productionRoute.provider &&
    route.integrationKey === productionRoute.integrationKey &&
    route.environment === productionRoute.environment &&
    route.enabled === productionRoute.enabled &&
    route.priority === productionRoute.priority
  );
}

function readRoutes(record: { valueJson: unknown; valueString: string | null }): unknown[] {
  const raw = record.valueJson ?? record.valueString;
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  if (process.env.ALLOW_PAYMENT_ROUTE_BOOTSTRAP !== 'true') {
    throw new Error(
      'Refusing payment route bootstrap. Set ALLOW_PAYMENT_ROUTE_BOOTSTRAP=true for an explicit operator run.',
    );
  }

  const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development';
  if (appEnv !== 'production' && appEnv !== 'staging') {
    throw new Error(
      'This operator script is limited to production or staging environments.',
    );
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
    throw new Error(
      `Refusing bootstrap: ${active.length} active routing records already exist.`,
    );
  }

  if (active.length === 1) {
    const routes = readRoutes(active[0]);
    if (routes.length === 1 && sameRoute(routes[0])) {
      console.log(
        'Payment route bootstrap already satisfied; no changes made.',
      );
      return;
    }
    throw new Error(
      'Refusing bootstrap: an existing active routing record conflicts with the EGP-only target.',
    );
  }

  const management = new ConfigurationManagementService(
    prisma as unknown as PrismaService,
    new ConfigurationAuthorizationService(),
  );
  await management.update({
    key,
    value: [productionRoute],
    scopeType: ConfigScopeType.GLOBAL,
    scopeRefId: null,
    actorType: 'DEPLOYMENT',
    actor: { type: 'DEPLOYMENT', permissions: ['configuration.system.write'] },
    reason: 'Explicit operator bootstrap of the production EGP payment route.',
    expectedUpdatedAt: null,
  });
  console.log(
    'Created one production EGP payment route. No USD route was created.',
  );
}

void main().finally(() => prisma.$disconnect());

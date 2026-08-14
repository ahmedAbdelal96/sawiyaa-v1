import 'dotenv/config';
import { ConfigDataType, ConfigScopeType, PrismaClient } from '@prisma/client';
import { validate } from '../../src/config/validation/env.schema';
import { ConfigurationAuthorizationService } from '../../src/modules/config/services/configuration-authorization.service';
import { ConfigurationManagementService } from '../../src/modules/config/services/configuration-management.service';
import { CONFIG_KEYS } from '../../src/modules/config/registry/config-key.constants';
import {
  PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS,
  assessPaymobControlBootstrap,
  assertPaymobControlBootstrapAllowed,
  createPaymobControlBootstrapCommands,
} from '../../src/modules/payment-gateway-control/bootstrap/paymob-provider-control-bootstrap.policy';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

const prisma = new PrismaClient();

function extractConfigValue(
  record: {
    valueString: string | null;
    valueNumber: { toNumber(): number } | null;
    valueBoolean: boolean | null;
    valueJson: unknown;
    configKey: { dataType: ConfigDataType };
  },
): unknown {
  switch (record.configKey.dataType) {
    case ConfigDataType.BOOLEAN:
      return record.valueBoolean;
    case ConfigDataType.NUMBER:
      return record.valueNumber?.toNumber() ?? null;
    case ConfigDataType.STRING:
      return record.valueString;
    case ConfigDataType.STRING_ARRAY:
    case ConfigDataType.JSON:
      return record.valueJson;
    case ConfigDataType.NUMBER_ARRAY:
      return record.valueJson;
  }
}

async function main(): Promise<void> {
  const appEnv = assertPaymobControlBootstrapAllowed({
    appEnv: process.env.APP_ENV ?? process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    allowBootstrap: process.env.ALLOW_PAYMOB_CONTROL_BOOTSTRAP,
  });

  try {
    validate(process.env);
  } catch (error) {
    throw new Error(
      `Refusing Paymob control bootstrap: runtime environment is invalid. ${error instanceof Error ? error.message : ''}`,
    );
  }

  const catalogs = await prisma.configKeyCatalog.findMany({
    where: { key: { in: [...PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS] } },
    select: { id: true, key: true },
  });
  if (catalogs.length !== PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS.length) {
    const found = new Set(catalogs.map((catalog) => catalog.key));
    const missing = PAYMOB_PROVIDER_CONTROL_BOOTSTRAP_KEYS.filter(
      (key) => !found.has(key),
    );
    throw new Error(
      `Refusing Paymob control bootstrap: missing configuration catalog entries ${missing.join(', ')}.`,
    );
  }

  const activeRecords = await prisma.configValue.findMany({
    where: {
      configKeyId: { in: catalogs.map((catalog) => catalog.id) },
      scopeType: ConfigScopeType.GLOBAL,
      scopeRefId: null,
      isActive: true,
    },
    include: { configKey: { select: { key: true, dataType: true } } },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
  });

  const activeValues = new Map<string, unknown[]>();
  for (const record of activeRecords) {
    const values = activeValues.get(record.configKey.key) ?? [];
    values.push(extractConfigValue(record));
    activeValues.set(record.configKey.key, values);
  }

  const assessment = assessPaymobControlBootstrap(activeValues);
  if (assessment.status === 'SATISFIED') {
    console.log(`${assessment.message} Environment: ${appEnv}.`);
    return;
  }
  if (assessment.status !== 'EMPTY') {
    throw new Error(assessment.message);
  }

  const management = new ConfigurationManagementService(
    prisma as unknown as PrismaService,
    new ConfigurationAuthorizationService(),
  );
  await management.updateManyWithTransaction(
    createPaymobControlBootstrapCommands(new Date(0)),
    (_tx, results) => results,
  );

  console.log(
    `Initialized Paymob provider control for production EGP CARD (${appEnv}). No credentials, Stripe settings, USD routes, or payment records were written.`,
  );
}

void main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : 'Paymob control bootstrap failed.',
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

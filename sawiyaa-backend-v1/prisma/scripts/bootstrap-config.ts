import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedConfigData } from '../seed/modules/config.seed';
import { assertConfigBootstrapAllowed } from './config-bootstrap.policy';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const appEnv = assertConfigBootstrapAllowed({
    appEnv: process.env.APP_ENV ?? process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    allowBootstrap: process.env.ALLOW_CONFIG_BOOTSTRAP,
    allowDevelopment: process.env.CONFIG_BOOTSTRAP_ALLOW_DEVELOPMENT,
  });

  const summary = await seedConfigData(prisma);
  console.log(
    JSON.stringify(
      {
        command: 'db:bootstrap:config',
        appEnv,
        scope: 'config-catalog-and-global-initial-values-only',
        summary,
      },
      null,
      2,
    ),
  );
}

void main()
  .catch((error: unknown) => {
    console.error('Config bootstrap failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

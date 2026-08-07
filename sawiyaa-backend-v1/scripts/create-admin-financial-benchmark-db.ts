import { PrismaClient } from '@prisma/client';

const databaseName = process.env.FINANCIAL_BENCHMARK_DATABASE ?? 'sawiyaa_finance_perf_20260805';
const sourceUrl = process.env.DATABASE_URL ?? '';
const source = new URL(sourceUrl);
source.pathname = '/postgres';
const prisma = new PrismaClient({ datasourceUrl: source.toString() });

async function main() {
  await prisma.$connect();
  const exists = await prisma.$queryRaw<Array<{ exists: boolean }>>`SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${databaseName})`;
  if (!exists[0]?.exists) await prisma.$executeRawUnsafe(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
  console.log(`${databaseName} ${exists[0]?.exists ? 'already exists' : 'created'}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});

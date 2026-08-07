import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { AdminFinancialOverviewService } from '../src/modules/financial-operations/services/admin-financial-overview.service';

type Scope = 'ACCOUNTING' | 'COLLECTIONS' | 'WALLET' | 'PAYOUT';

const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
Logger.overrideLogger(['error']);
const service = new AdminFinancialOverviewService(prisma as never);
const queryEvents: Array<{ duration: number }> = [];

prisma.$on('query', (event) => queryEvents.push({ duration: event.duration }));

function percentile(values: number[], p: number) {
  const ordered = [...values].sort((a, b) => a - b);
  if (!ordered.length) return 0;
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * p) - 1)];
}

async function settleQueryEvents() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function measure(name: string, scope: Scope, query: Record<string, string | undefined>) {
  await service.execute(query, scope);
  await settleQueryEvents();
  const coldStart = performance.now();
  const coldBefore = queryEvents.length;
  const cold = await service.execute(query, scope);
  await settleQueryEvents();
  const coldDuration = performance.now() - coldStart;
  const coldEvents = queryEvents.slice(coldBefore);
  const warmDurations: number[] = [];
  const warmQueryCounts: number[] = [];
  const warmDbDurations: number[] = [];
  let slowestQueryMs = 0;
  let payloadBytes = 0;
  let heapBefore = process.memoryUsage().heapUsed;
  for (let i = 0; i < 10; i += 1) {
    const before = queryEvents.length;
    const started = performance.now();
    const result = await service.execute(query, scope);
    await settleQueryEvents();
    warmDurations.push(performance.now() - started);
    warmQueryCounts.push(queryEvents.length - before);
    const requestQueryEvents = queryEvents.slice(before);
    warmDbDurations.push(requestQueryEvents.reduce((sum, event) => sum + event.duration, 0));
    slowestQueryMs = Math.max(slowestQueryMs, ...requestQueryEvents.map((event) => event.duration));
    payloadBytes = Buffer.byteLength(JSON.stringify(result), 'utf8');
  }
  const heapAfter = process.memoryUsage().heapUsed;
  return {
    name,
    scope,
    query,
    coldMs: Number(coldDuration.toFixed(2)),
    coldDbMs: Number(coldEvents.reduce((sum, event) => sum + event.duration, 0).toFixed(2)),
    coldQueryCount: coldEvents.length,
    warmP50Ms: Number(percentile(warmDurations, 0.5).toFixed(2)),
    warmP95Ms: Number(percentile(warmDurations, 0.95).toFixed(2)),
    warmDbP50Ms: Number(percentile(warmDbDurations, 0.5).toFixed(2)),
    slowestQueryMs: Number(slowestQueryMs.toFixed(2)),
    warmQueryCount: Math.max(...warmQueryCounts),
    warmQueryCountRange: [Math.min(...warmQueryCounts), Math.max(...warmQueryCounts)],
    payloadBytes,
    heapDeltaBytes: heapAfter - heapBefore,
    bucketCount: Object.values(cold.metrics).reduce((count, value) => count + (Array.isArray(value) ? value.length : 0), 0),
  };
}

async function main() {
  await prisma.$connect();
  const cases = [
    ['accounting-unfiltered', 'ACCOUNTING' as const, {}],
    ['accounting-egp-date', 'ACCOUNTING' as const, { currency: 'EGP', fromDate: '2026-08-01T00:00:00.000Z', toDate: '2026-08-05T00:00:00.000Z' }],
    ['collections-unfiltered', 'COLLECTIONS' as const, {}],
    ['wallets-egp', 'WALLET' as const, { currency: 'EGP' }],
    ['payouts-egp', 'PAYOUT' as const, { currency: 'EGP' }],
  ] as const;
  const results: unknown[] = [];
  for (const [name, scope, query] of cases) results.push(await measure(name, scope, query));
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exitCode = 1;
});

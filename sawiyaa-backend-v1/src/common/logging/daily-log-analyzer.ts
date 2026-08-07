import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';

const MAX_DURATION_SAMPLE = 10_000;

export interface DailyAnalyzerOptions {
  directory: string;
}

interface RouteStats {
  route: string;
  module: string;
  operation: string;
  count: number;
  failures: number;
  durationsTotal: number;
  durationCount: number;
  durations: number[];
  maxDuration: number;
  slow: number;
  errorCodes: Map<string, number>;
}

export interface DailyAnalysisReport {
  total: number;
  successful: number;
  redirects: number;
  failed: number;
  malformedLines: number;
  filesRead: number;
  statusFamilies: Record<'2xx' | '3xx' | '4xx' | '5xx', number>;
  routes: RouteStats[];
  errorCodes: Map<string, number>;
  failureClasses: Map<string, number>;
  modules: Map<
    string,
    { total: number; failures: number; slow: number; serverErrors: number }
  >;
}

function safeLabel(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[^A-Za-z0-9_./:-]/g, '').slice(0, 160);
  return cleaned || fallback;
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(fraction * sorted.length));
  return sorted[rank - 1];
}

function addDuration(stats: RouteStats, duration: number): void {
  stats.durationsTotal += duration;
  stats.durationCount += 1;
  stats.maxDuration = Math.max(stats.maxDuration, duration);
  if (stats.durations.length < MAX_DURATION_SAMPLE)
    stats.durations.push(duration);
}

export function resolveHttpLogFiles(
  directory: string,
  names: string[],
): string[] {
  return names
    .filter((name) => /^http(?:\.\d+)?\.log$/i.test(name))
    .sort((left, right) => {
      const rank = (name: string) => {
        const match = /\.(\d+)\.log$/i.exec(name);
        return match ? Number(match[1]) : 0;
      };
      return rank(left) - rank(right);
    })
    .map((name) => path.join(directory, name));
}

export async function analyzeDailyLogs(
  options: DailyAnalyzerOptions,
): Promise<DailyAnalysisReport> {
  const entries = await readdir(options.directory);
  const files = resolveHttpLogFiles(options.directory, entries);
  const routes = new Map<string, RouteStats>();
  const errorCodes = new Map<string, number>();
  const failureClasses = new Map<string, number>();
  const modules = new Map<
    string,
    { total: number; failures: number; slow: number; serverErrors: number }
  >();
  const statusFamilies = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 } as Record<
    '2xx' | '3xx' | '4xx' | '5xx',
    number
  >;
  let total = 0;
  let successful = 0;
  let redirects = 0;
  let failed = 0;
  let malformedLines = 0;

  for (const file of files) {
    const input = createInterface({
      input: createReadStream(file, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });
    for await (const line of input) {
      if (!line.trim()) continue;
      let record: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(line);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
          throw new Error('not an object');
        record = parsed as Record<string, unknown>;
      } catch {
        malformedLines += 1;
        continue;
      }
      const statusCode =
        typeof record.statusCode === 'number' ? record.statusCode : 0;
      const family =
        typeof record.statusFamily === 'string' &&
        record.statusFamily in statusFamilies
          ? (record.statusFamily as keyof typeof statusFamilies)
          : (`${Math.floor(statusCode / 100)}xx` as keyof typeof statusFamilies);
      if (!(family in statusFamilies)) continue;
      total += 1;
      statusFamilies[family] += 1;
      if (family === '2xx') successful += 1;
      if (family === '3xx') redirects += 1;
      if (family === '4xx' || family === '5xx') failed += 1;
      const route = safeLabel(record.route ?? record.path, '/unknown');
      const module = safeLabel(record.module, 'other');
      const operation = safeLabel(record.operation, 'UNSPECIFIED');
      const key = `${route}\u0000${module}\u0000${operation}`;
      const stats = routes.get(key) ?? {
        route,
        module,
        operation,
        count: 0,
        failures: 0,
        durationsTotal: 0,
        durationCount: 0,
        durations: [],
        maxDuration: 0,
        slow: 0,
        errorCodes: new Map<string, number>(),
      };
      stats.count += 1;
      if (family === '4xx' || family === '5xx') stats.failures += 1;
      if (
        typeof record.durationMs === 'number' &&
        Number.isFinite(record.durationMs) &&
        record.durationMs >= 0
      )
        addDuration(stats, record.durationMs);
      if (record.isSlow === true) stats.slow += 1;
      const errorCode = safeLabel(record.errorCode, 'UNKNOWN_ERROR');
      if (family === '4xx' || family === '5xx') {
        increment(errorCodes, errorCode);
        increment(stats.errorCodes, errorCode);
        increment(failureClasses, safeLabel(record.failureClass, 'unknown'));
      }
      const moduleStats = modules.get(module) ?? {
        total: 0,
        failures: 0,
        slow: 0,
        serverErrors: 0,
      };
      moduleStats.total += 1;
      if (family === '4xx' || family === '5xx') moduleStats.failures += 1;
      if (family === '5xx') moduleStats.serverErrors += 1;
      if (record.isSlow === true) moduleStats.slow += 1;
      modules.set(module, moduleStats);
      routes.set(key, stats);
    }
  }
  return {
    total,
    successful,
    redirects,
    failed,
    malformedLines,
    filesRead: files.length,
    statusFamilies,
    routes: [...routes.values()],
    errorCodes,
    failureClasses,
    modules,
  };
}

function sortedEntries(map: Map<string, number>): [string, number][] {
  return [...map.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

export function renderDailyReport(
  report: DailyAnalysisReport,
  dateLabel: string,
): string {
  const percentage = report.total
    ? ((report.successful / report.total) * 100).toFixed(2)
    : '0.00';
  const routeRows = [...report.routes]
    .sort((a, b) => b.failures - a.failures || a.route.localeCompare(b.route))
    .slice(0, 10);
  const slowGroups = new Map<
    string,
    {
      route: string;
      count: number;
      durationsTotal: number;
      durationCount: number;
      durations: number[];
      maxDuration: number;
    }
  >();
  for (const row of report.routes) {
    const group = slowGroups.get(row.route) ?? {
      route: row.route,
      count: 0,
      durationsTotal: 0,
      durationCount: 0,
      durations: [],
      maxDuration: 0,
    };
    group.count += row.count;
    group.durationsTotal += row.durationsTotal;
    group.durationCount += row.durationCount;
    group.durations.push(...row.durations);
    group.maxDuration = Math.max(group.maxDuration, row.maxDuration);
    slowGroups.set(row.route, group);
  }
  const slowRows = [...slowGroups.values()]
    .sort(
      (a, b) => b.maxDuration - a.maxDuration || a.route.localeCompare(b.route),
    )
    .slice(0, 10);
  const moduleRows = [...report.modules.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const health = (stats: {
    total: number;
    failures: number;
    slow: number;
    serverErrors: number;
  }): string => {
    const failureRate = stats.total ? stats.failures / stats.total : 0;
    const slowRate = stats.total ? stats.slow / stats.total : 0;
    if (stats.failures > 0 && (failureRate >= 0.1 || stats.serverErrors > 0))
      return '🔴';
    if (failureRate >= 0.03 || slowRate >= 0.1) return '🟡';
    return '🟢';
  };
  const routeTable = routeRows.length
    ? routeRows
        .map(
          (row) =>
            `| ${row.route} | ${row.module} | ${row.operation} | ${row.failures} | ${report.failed ? ((row.failures / report.failed) * 100).toFixed(2) : '0.00'}% | ${[...sortedEntries(row.errorCodes).slice(0, 3)].map(([code, count]) => `${code} (${count})`).join(', ') || '-'} |`,
        )
        .join('\n')
    : '| - | - | - | 0 | 0.00% | - |';
  const slowTable = slowRows.length
    ? slowRows
        .map(
          (row) =>
            `| ${row.route} | ${row.count} | ${(row.durationsTotal / Math.max(row.durationCount, 1)).toFixed(2)} | ${percentile(row.durations, 0.5)} | ${percentile(row.durations, 0.95)} | ${percentile(row.durations, 0.99)} | ${row.maxDuration} |`,
        )
        .join('\n')
    : '| - | 0 | 0 | 0 | 0 | 0 | 0 |';
  return `# Sawiyaa HTTP log summary — ${dateLabel}

## Traffic summary

- Total requests: ${report.total}
- Successful requests (2xx): ${report.successful}
- Redirects (3xx): ${report.redirects}
- Failed requests (4xx/5xx): ${report.failed}
- Success percentage: ${percentage}%
- Malformed lines: ${report.malformedLines}
- Files read: ${report.filesRead}

## Status distribution

| Family | Count |
| --- | ---: |
| 2xx | ${report.statusFamilies['2xx']} |
| 3xx | ${report.statusFamilies['3xx']} |
| 4xx | ${report.statusFamilies['4xx']} |
| 5xx | ${report.statusFamilies['5xx']} |

## Top failing routes

| Route | Module | Operation | Failures | Failure % | Top error codes |
| --- | --- | --- | ---: | ---: | --- |
${routeTable}

## Slow APIs

Percentiles use nearest-rank over a deterministic first-${MAX_DURATION_SAMPLE}-duration sample per route; averages and maxima use all records.

| Route | Requests | Average ms | P50 ms | P95 ms | P99 ms | Max ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${slowTable}

## Error analysis

- Top error codes: ${
    sortedEntries(report.errorCodes)
      .slice(0, 10)
      .map(([code, count]) => `${code} (${count})`)
      .join(', ') || '-'
  }
- Failure classes: ${
    sortedEntries(report.failureClasses)
      .map(([name, count]) => `${name} (${count})`)
      .join(', ') || '-'
  }

## Module health summary

Health is deterministic: 🔴 means failure rate ≥10% or any 5xx on a failing module; 🟡 means failure rate ≥3% or slow rate ≥10%; 🟢 means neither threshold is met.

${moduleRows.length ? moduleRows.map(([module, stats]) => `- ${module} ${health(stats)} (${stats.failures}/${stats.total} failed, ${stats.slow} slow)`).join('\n') : '- No module records'}
`;
}

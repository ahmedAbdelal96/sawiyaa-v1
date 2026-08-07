import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  analyzeDailyLogs,
  renderDailyReport,
} from '../src/common/logging/daily-log-analyzer';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const date = argument('--date');
  const explicitDirectory = argument('--dir');
  if (!date && !explicitDirectory)
    throw new Error(
      'Usage: npm run logs:analyze -- --date YYYY-MM-DD | --dir PATH',
    );
  const directory =
    explicitDirectory ?? path.join('logs', 'backend', date as string);
  const report = await analyzeDailyLogs({ directory });
  const dateLabel = date ?? path.basename(path.resolve(directory));
  const outputDirectory = path.join('reports');
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, `${dateLabel}-summary.md`);
  await writeFile(outputPath, renderDailyReport(report, dateLabel), 'utf8');
  console.log(`Wrote ${outputPath}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

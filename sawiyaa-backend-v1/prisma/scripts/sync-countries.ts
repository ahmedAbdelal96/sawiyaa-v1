import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const APPLY_FLAG = '--apply';
const DRY_RUN_FLAG = '--dry-run';
const JSON_FLAG = '--json';

const CANONICAL_COUNTRIES = [
  {
    isoCode: 'EG',
    slug: 'egypt',
    name: 'Egypt',
    nativeName: 'Egypt',
    phoneCode: '+20',
    currencyCode: 'EGP',
    isActive: true,
  },
  {
    isoCode: 'SA',
    slug: 'saudi-arabia',
    name: 'Saudi Arabia',
    nativeName: 'Saudi Arabia',
    phoneCode: '+966',
    currencyCode: 'SAR',
    isActive: true,
  },
  {
    isoCode: 'AE',
    slug: 'united-arab-emirates',
    name: 'United Arab Emirates',
    nativeName: 'United Arab Emirates',
    phoneCode: '+971',
    currencyCode: 'AED',
    isActive: true,
  },
  {
    isoCode: 'KW',
    slug: 'kuwait',
    name: 'Kuwait',
    nativeName: 'Kuwait',
    phoneCode: '+965',
    currencyCode: 'KWD',
    isActive: true,
  },
  {
    isoCode: 'QA',
    slug: 'qatar',
    name: 'Qatar',
    nativeName: 'Qatar',
    phoneCode: '+974',
    currencyCode: 'QAR',
    isActive: true,
  },
] as const;

type SyncSummary = {
  mode: 'dry-run' | 'apply';
  canonicalCount: number;
  existingCount: number;
  createdCount: number;
  unchangedCount: number;
  missingIsoCodesBefore: string[];
};

function parseArgs(argv: string[]) {
  const supported = new Set([APPLY_FLAG, DRY_RUN_FLAG, JSON_FLAG]);
  const unknown = argv.filter((arg) => !supported.has(arg));
  if (unknown.length > 0) {
    throw new Error(`Unsupported arguments: ${unknown.join(', ')}`);
  }

  const dryRun = argv.includes(DRY_RUN_FLAG);
  const apply = argv.includes(APPLY_FLAG);
  if (dryRun && apply) {
    throw new Error('Use either --dry-run or --apply, not both.');
  }

  return {
    dryRun: !apply,
    json: argv.includes(JSON_FLAG),
  };
}

async function syncCountries(
  prisma: PrismaClient,
  dryRun: boolean,
): Promise<SyncSummary> {
  const existing = await prisma.country.findMany({
    select: { isoCode: true },
  });
  const existingIso = new Set(existing.map((row) => row.isoCode.toUpperCase()));

  const missing = CANONICAL_COUNTRIES.filter(
    (country) => !existingIso.has(country.isoCode),
  );

  if (!dryRun) {
    for (const country of missing) {
      await prisma.country.create({
        data: {
          isoCode: country.isoCode,
          slug: country.slug,
          name: country.name,
          nativeName: country.nativeName,
          phoneCode: country.phoneCode,
          currencyCode: country.currencyCode,
          isActive: country.isActive,
        },
      });
    }
  }

  return {
    mode: dryRun ? 'dry-run' : 'apply',
    canonicalCount: CANONICAL_COUNTRIES.length,
    existingCount: existing.length,
    createdCount: missing.length,
    unchangedCount: CANONICAL_COUNTRIES.length - missing.length,
    missingIsoCodesBefore: missing.map((country) => country.isoCode),
  };
}

async function main() {
  const { dryRun, json } = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const summary = await syncCountries(prisma, dryRun);

    if (json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    console.log(`[country-sync] mode=${summary.mode}`);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    '[country-sync] failed:',
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});

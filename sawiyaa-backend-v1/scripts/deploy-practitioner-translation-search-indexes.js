const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ quiet: true });

const TARGET_TABLE = 'PractitionerProfileTranslation';
const INDEXES = [
  {
    name: 'practitioner_profile_translation_professional_title_trgm_idx',
    column: 'professionalTitle',
    create:
      'CREATE INDEX CONCURRENTLY "practitioner_profile_translation_professional_title_trgm_idx" ON "PractitionerProfileTranslation" USING GIN ("professionalTitle" gin_trgm_ops)',
  },
  {
    name: 'practitioner_profile_translation_bio_trgm_idx',
    column: 'bio',
    create:
      'CREATE INDEX CONCURRENTLY "practitioner_profile_translation_bio_trgm_idx" ON "PractitionerProfileTranslation" USING GIN (bio gin_trgm_ops)',
  },
];

const prisma = new PrismaClient();

function expectedShape(index) {
  return {
    tableName: TARGET_TABLE,
    accessMethod: 'gin',
    columns: [index.column],
    operatorClasses: ['gin_trgm_ops'],
  };
}

function isMatchingDefinition(row, index) {
  if (!row) return false;
  const expected = expectedShape(index);
  return (
    row.table_name === expected.tableName &&
    row.access_method === expected.accessMethod &&
    JSON.stringify(row.columns) === JSON.stringify(expected.columns) &&
    JSON.stringify(row.operator_classes) ===
      JSON.stringify(expected.operatorClasses)
  );
}

function isReady(row, index) {
  return (
    isMatchingDefinition(row, index) &&
    row.indisvalid === true &&
    row.indisready === true
  );
}

async function queryIndexByName(name) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT
        idx.relname AS name,
        tbl.relname AS table_name,
        am.amname AS access_method,
        i.indisvalid,
        i.indisready,
        ARRAY(
          SELECT a.attname::text
          FROM unnest(i.indkey) WITH ORDINALITY AS keys(attnum, ord)
          JOIN pg_attribute a
            ON a.attrelid = i.indrelid
           AND a.attnum = keys.attnum
          ORDER BY keys.ord
        ) AS columns,
        ARRAY(
          SELECT opc.opcname::text
          FROM unnest(i.indclass) WITH ORDINALITY AS classes(opcoid, ord)
          JOIN pg_opclass opc ON opc.oid = classes.opcoid
          ORDER BY classes.ord
        ) AS operator_classes,
        pg_get_indexdef(i.indexrelid) AS index_definition
      FROM pg_index i
      JOIN pg_class idx ON idx.oid = i.indexrelid
      JOIN pg_class tbl ON tbl.oid = i.indrelid
      JOIN pg_namespace ns ON ns.oid = idx.relnamespace
      JOIN pg_am am ON am.oid = idx.relam
      WHERE ns.nspname = 'public'
        AND idx.relname = $1
    `,
    name,
  );
  return rows[0] ?? null;
}

async function queryEquivalentIndexes(index) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT
        idx.relname AS name,
        tbl.relname AS table_name,
        am.amname AS access_method,
        i.indisvalid,
        i.indisready,
        ARRAY(
          SELECT a.attname::text
          FROM unnest(i.indkey) WITH ORDINALITY AS keys(attnum, ord)
          JOIN pg_attribute a
            ON a.attrelid = i.indrelid
           AND a.attnum = keys.attnum
          ORDER BY keys.ord
        ) AS columns,
        ARRAY(
          SELECT opc.opcname::text
          FROM unnest(i.indclass) WITH ORDINALITY AS classes(opcoid, ord)
          JOIN pg_opclass opc ON opc.oid = classes.opcoid
          ORDER BY classes.ord
        ) AS operator_classes,
        pg_get_indexdef(i.indexrelid) AS index_definition
      FROM pg_index i
      JOIN pg_class idx ON idx.oid = i.indexrelid
      JOIN pg_class tbl ON tbl.oid = i.indrelid
      JOIN pg_namespace ns ON ns.oid = idx.relnamespace
      JOIN pg_am am ON am.oid = idx.relam
      WHERE ns.nspname = 'public'
        AND tbl.relname = $1
    `,
    TARGET_TABLE,
  );
  return rows.filter((row) => isMatchingDefinition(row, index));
}

async function getExtensionState() {
  const [available] = await prisma.$queryRawUnsafe(
    `SELECT name, default_version FROM pg_available_extensions WHERE name = 'pg_trgm'`,
  );
  const [installed] = await prisma.$queryRawUnsafe(
    `SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm'`,
  );
  return { available: available ?? null, installed: installed ?? null };
}

async function assertExtensionReady() {
  const state = await getExtensionState();
  if (!state.available) {
    throw new Error('pg_trgm is not available on this PostgreSQL deployment.');
  }
  if (!state.installed) {
    throw new Error(
      'pg_trgm is available but not installed. Apply the Prisma extension migration before building indexes.',
    );
  }
  console.log(
    `pg_trgm ${state.installed.extversion} is installed and available.`,
  );
}

async function assertTargetTable() {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = $1 AND c.relkind = 'r'
      ) AS exists
    `,
    TARGET_TABLE,
  );
  if (!rows[0]?.exists) {
    throw new Error(`Required table ${TARGET_TABLE} does not exist.`);
  }
}

async function inspect(index) {
  const named = await queryIndexByName(index.name);
  const equivalents = await queryEquivalentIndexes(index);
  const equivalentReady = equivalents.find(
    (row) => row.indisvalid && row.indisready,
  );
  return { named, equivalents, equivalentReady };
}

function assertNoConflict(index, inspection) {
  if (inspection.named && !isMatchingDefinition(inspection.named, index)) {
    throw new Error(
      `STOP: ${index.name} already exists with a conflicting definition: ${inspection.named.index_definition}`,
    );
  }
}

function assertNoUnexpectedInvalidEquivalent(index, inspection) {
  const invalidEquivalents = inspection.equivalents.filter(
    (row) => row.name !== index.name && (!row.indisvalid || !row.indisready),
  );
  if (invalidEquivalents.length > 0) {
    throw new Error(
      `STOP: invalid equivalent index(es) already exist for ${index.column}: ${invalidEquivalents
        .map((row) => row.name)
        .join(
          ', ',
        )}. Resolve them before deployment so no invalid index is left behind.`,
    );
  }
}

async function removeInvalidNamedIndex(index, inspection) {
  if (!inspection.named || isReady(inspection.named, index)) return;
  if (!isMatchingDefinition(inspection.named, index)) {
    throw new Error(
      `STOP: invalid named index ${index.name} has a conflicting definition.`,
    );
  }
  console.log(`Removing invalid index ${index.name} before retry.`);
  await prisma.$executeRawUnsafe(
    `DROP INDEX CONCURRENTLY IF EXISTS "${index.name}"`,
  );
  const remaining = await queryIndexByName(index.name);
  if (remaining)
    throw new Error(`Invalid index ${index.name} could not be removed.`);
}

async function validateReady(index) {
  const inspection = await inspect(index);
  assertNoConflict(index, inspection);
  if (inspection.named && isReady(inspection.named, index)) {
    return inspection.named;
  }
  if (inspection.equivalentReady) {
    console.log(
      `Equivalent ready index ${inspection.equivalentReady.name} satisfies ${index.name}; no duplicate index will be created.`,
    );
    return inspection.equivalentReady;
  }
  throw new Error(`Index ${index.name} is not present and valid/ready.`);
}

async function printOperationalState(label) {
  const progress = await prisma.$queryRawUnsafe(`
    SELECT pid, relid::regclass::text AS table_name,
           index_relid::regclass::text AS index_name,
           phase, blocks_done, blocks_total, tuples_done, tuples_total
    FROM pg_stat_progress_create_index
    WHERE datname = current_database()
  `);
  const waiting = await prisma.$queryRawUnsafe(`
    SELECT pid, wait_event_type, wait_event, state, left(query, 180) AS query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND wait_event IS NOT NULL
  `);
  console.log(
    `${label}: progress=${JSON.stringify(progress)} waiting=${JSON.stringify(waiting)}`,
  );
}

async function deploy() {
  await assertExtensionReady();
  await assertTargetTable();
  for (const index of INDEXES) {
    let inspection = await inspect(index);
    assertNoConflict(index, inspection);
    assertNoUnexpectedInvalidEquivalent(index, inspection);
    await removeInvalidNamedIndex(index, inspection);
    inspection = await inspect(index);
    assertNoConflict(index, inspection);
    assertNoUnexpectedInvalidEquivalent(index, inspection);
    if (inspection.named && isReady(inspection.named, index)) {
      console.log(`${index.name} is already valid and ready.`);
      continue;
    }
    if (inspection.equivalentReady) {
      console.log(
        `Equivalent index ${inspection.equivalentReady.name} is already ready for ${index.column}.`,
      );
      continue;
    }
    await printOperationalState(`before ${index.name}`);
    console.log(
      `Creating ${index.name} sequentially with CREATE INDEX CONCURRENTLY.`,
    );
    await prisma.$executeRawUnsafe(index.create);
    await validateReady(index);
    console.log(`${index.name} is valid and ready.`);
  }
  for (const index of INDEXES) await validateReady(index);
  await printOperationalState('after deployment');
}

async function rollback() {
  await assertExtensionReady();
  for (const index of [...INDEXES].reverse()) {
    const inspection = await inspect(index);
    assertNoConflict(index, inspection);
    assertNoUnexpectedInvalidEquivalent(index, inspection);
    if (!inspection.named) {
      console.log(`${index.name} is absent.`);
      continue;
    }
    if (!isMatchingDefinition(inspection.named, index)) {
      throw new Error(
        `STOP: refusing to drop conflicting index ${index.name}.`,
      );
    }
    console.log(`Dropping ${index.name} with DROP INDEX CONCURRENTLY.`);
    await prisma.$executeRawUnsafe(
      `DROP INDEX CONCURRENTLY IF EXISTS "${index.name}"`,
    );
    if (await queryIndexByName(index.name))
      throw new Error(`Rollback did not remove ${index.name}.`);
  }
  const extension = await getExtensionState();
  if (!extension.installed)
    throw new Error('pg_trgm unexpectedly disappeared during index rollback.');
  console.log('Index rollback verified; pg_trgm remains installed.');
}

async function status() {
  console.log(
    `database=${(await prisma.$queryRawUnsafe('SELECT current_database() AS name'))[0].name}`,
  );
  console.log(`extension=${JSON.stringify(await getExtensionState())}`);
  for (const index of INDEXES)
    console.log(index.name, JSON.stringify(await inspect(index)));
  await printOperationalState('status');
}

async function main() {
  await prisma.$connect();
  const mode = process.argv.includes('--rollback')
    ? 'rollback'
    : process.argv.includes('--status')
      ? 'status'
      : 'deploy';
  if (mode === 'rollback') await rollback();
  else if (mode === 'status') await status();
  else await deploy();
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

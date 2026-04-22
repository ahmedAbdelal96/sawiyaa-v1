# Prisma Seed Structure

This folder keeps seed logic modular and easy to maintain.

## Structure

- `modules/*.seed.ts`: one seed file per module/domain concern.
- `shared/seed.types.ts`: shared module contract.
- `shared/seed.constants.ts`: deterministic IDs and reusable credentials.
- `shared/seed.utils.ts`: common seed helpers.
- `../seed.ts`: root orchestrator that runs module seeds in deterministic order.

## Current Modules

- `users.seed.ts`
- `auth.seed.ts`
- `reference-data.seed.ts`
- `specialties.seed.ts`
- `patients.seed.ts`
- `practitioners.seed.ts`
- `admin.seed.ts`
- `notifications.seed.ts`
- `config.seed.ts`
- `regional-bulk.seed.ts`
- `settlements-lab.seed.ts`
- `accounting.seed.ts`
- `audit-events.seed.ts`

## Usage

Run:

```bash
npm run prisma:seed
```

### Bulk Regional Dataset (Egypt + Arab Region)

`regional-bulk.seed.ts` adds large deterministic fixtures across core modules
for realistic end-to-end/system testing and pagination stress checks.

Use `SEED_SCALE` to control volume:

```bash
# default = medium
SEED_SCALE=small npm run prisma:seed
SEED_SCALE=medium npm run prisma:seed
SEED_SCALE=large npm run prisma:seed
```

PowerShell examples:

```powershell
$env:SEED_SCALE='small'; npm run prisma:seed
$env:SEED_SCALE='medium'; npm run prisma:seed
$env:SEED_SCALE='large'; npm run prisma:seed
```

Scale intent:

- `small`: fast local smoke + basic pagination
- `medium`: strong local/dev test coverage (recommended default)
- `large`: heavy pagination/load-shape dataset for deeper testing

Or after reset:

```bash
npm run db:reset
```

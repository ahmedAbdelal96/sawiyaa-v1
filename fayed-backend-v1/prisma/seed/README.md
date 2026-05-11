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
- `curated-dev.seed.ts`
- `regional-bulk.seed.ts`
- `settlements-lab.seed.ts`
- `accounting.seed.ts`
- `audit-events.seed.ts`

## Usage

Run:

```bash
npm run prisma:seed
```

### Seed Profiles

The default seed profile is curated and QA-friendly:

```bash
npm run prisma:seed
```

It seeds a small, realistic dataset for:

- patient journeys
- practitioner onboarding
- booking and sessions
- payments and refunds
- academy and package flows
- messaging and unread states
- wallet balances and notifications
- availability and edge cases

For larger stress datasets, opt into the bulk profile:

```bash
SEED_PROFILE=bulk npm run prisma:seed
```

PowerShell:

```powershell
$env:SEED_PROFILE='bulk'; npm run prisma:seed
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
- `medium`: strong local/dev test coverage (recommended for bulk profile)
- `large`: heavy pagination/load-shape dataset for deeper testing

`SEED_SCALE` only matters when `SEED_PROFILE=bulk` is enabled.

## Documented Test Accounts

| Account | Email | Password | What to test |
|---|---|---|---|
| Egyptian patient | `ahmed.patient@hesba.local` | `Patient@12345` | booking, wallet EGP flows, academy enrollment, unread messages, active sessions |
| International patient | `mohamed.patient@hesba.local` | `Patient2@12345` | USD checkout, international practitioner discovery, refunds, package history |
| New patient | `omar.patient@hesba.local` | `Patient3@12345` | onboarding, empty states, incomplete profile, first-time academy/package flows |
| Verified practitioner | `dr.mohamed@hesba.local` | `Practitioner2@12345` | onboarding approved, availability, sessions workspace, unread chats |
| Pending practitioner | `dr.ahmed@hesba.local` | `Practitioner@12345` | onboarding completeness, verification requirements, incomplete profile |
| Support agent | `support@hesba.local` | `Support@12345` | support inbox, chat handling, ticket-linked conversations |
| System admin | `admin@hesba.local` | `Admin@12345` | admin dashboards, settlements, accounting visibility |
| Content reviewer | `reviewer@hesba.local` | `Reviewer@12345` | content review surfaces and read-only QA flows |

Or after reset:

```bash
npm run db:reset
```


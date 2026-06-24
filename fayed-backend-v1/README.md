# Sawiyaa Backend v1

NestJS modular-monolith backend for the Sawiyaa guided-care platform.

## Stack

- NestJS
- PostgreSQL
- Prisma
- REST APIs (versioned under `/api/v1`)
- Zod-based environment validation

## Quick Start

1. Copy environment file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Apply development migrations:

```bash
npm run prisma:migrate:dev
```

5. Seed baseline data (optional):

```bash
npm run prisma:seed
```

6. Run development server:

```bash
npm run start:dev
```

## Common Scripts

- `npm run start:dev`
- `npm run start:debug`
- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run prisma:generate`
- `npm run prisma:migrate:dev`
- `npm run prisma:migrate:deploy`
- `npm run prisma:studio`
- `npm run prisma:seed`
- `npm run db:reset`

## Health Check

Endpoint:

```text
GET /api/v1/health
```

## API Envelope Conventions

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "errorCode": "MACHINE_READABLE_CODE",
  "messageKey": "i18n.message.key",
  "message": "Localized or fallback text",
  "errors": [],
  "timestamp": "ISO-8601",
  "path": "/api/v1/...",
  "locale": "ar|en",
  "requestId": "optional"
}
```

## Active Module Coverage (from `src/app.module.ts`)

- `auth`, `users`, `patients`, `practitioners`
- `articles`, `assessments`, `matching`, `patient-journey`
- `availability`, `presence`, `sessions`, `instant-booking`
- `payments`, `financial-rules`, `financial-operations`
- `support`, `care-chat`, `moderation`, `notifications`
- `specialties`, `training`
- `chat` (general chat contracts)
- `settings` (user settings baseline)
- `admin`, `config`

## Scope Notes

- Core guided-care backend lanes are implemented and contract-usable.
- General chat/settings contracts exist in backend but may remain deferred in frontend product scope by explicit planning choice.
- Some operational areas are intentionally baseline-first and can be expanded additively.

## Source-of-Truth Docs

- Backend current-state audit:
  - `docs/backend-current-state-audit.md`
- Frontend-facing API contract freeze reference:
  - `docs/api-contract-freeze-reference.md`
- Backend next-phase tracker:
  - `BACKEND_NEXT_PHASE_TRACKER.md`
- Payments testing and env setup:
  - `docs/payments-testing.md`

Keep these files aligned with controller and DTO changes.

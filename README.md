# Fayed Platform Monorepo

Production codebase for the Fayed care platform, organized as a multi-app repository (backend, web frontend, mobile) with shared product and architecture documentation.

## What Is In This Repository

| Path | Purpose | Stack |
|---|---|---|
| `fayed-backend-v1` | Main backend API | NestJS + Prisma + PostgreSQL |
| `fayed-frontend-v1` | Main web app (admin + product surfaces) | Next.js + React + TypeScript |
| `fayed-mobile-v1` | Mobile app | Expo + React Native + TypeScript |
| `docs` | Product plans, schemas, roadmaps, integration notes | Markdown + Prisma docs |

Additional folders such as `figma design`, `shezlong`, and `stitch` are references/artifacts and are not primary runtime services.

## Architecture At A Glance

```text
Web Frontend (Next.js) ----\
                            > Backend API (NestJS, /api/v1) ---> PostgreSQL (Prisma)
Mobile App (Expo) ---------/
```

## Prerequisites

- Node.js `20+` (recommended)
- npm `10+`
- PostgreSQL instance for backend

## 10-Minute Local Setup

### 1) Backend API

```powershell
cd D:\Web\full-projects\fayed\fayed-backend-v1
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
npm run start:dev
```

Backend notes:

- API prefix: `/api/v1`
- Swagger: `/api/docs`
- Default port (if `PORT` is not set): `3000`
- Default allowed frontend origins include `http://localhost:3000`

### 2) Web Frontend

```powershell
cd D:\Web\full-projects\fayed\fayed-frontend-v1
npm install
npm run dev
```

### 3) Mobile (Optional During Web/Backend Work)

```powershell
cd D:\Web\full-projects\fayed\fayed-mobile-v1
npm install
npm run start
```

## Common Commands

### Backend (`fayed-backend-v1`)

- `npm run start:dev` - run NestJS in watch mode
- `npm run test` - run test suite
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript check
- `npm run prisma:migrate:dev` - apply/create dev migrations
- `npm run prisma:studio` - open Prisma Studio

### Frontend (`fayed-frontend-v1`)

- `npm run dev` - run Next.js locally
- `npm run lint` - lint + i18n checks
- `npm run i18n:check` - translation integrity checks
- `npm run build` - production build (includes i18n check)

### Mobile (`fayed-mobile-v1`)

- `npm run start` - start Expo dev server
- `npm run android` - run Android target
- `npm run ios` - run iOS target
- `npm run typecheck` - TypeScript check

## Environment Configuration

Each app manages its own environment file(s):

- `fayed-backend-v1/.env`
- `fayed-frontend-v1/.env.local`
- `fayed-mobile-v1/.env` (if used by mobile setup)

Keep API base URLs aligned across frontend/mobile to the backend host and port.

## Development Workflow

1. Work inside the relevant app folder (`backend`, `frontend`, or `mobile`).
2. Keep contracts in sync: backend DTO/controller updates must be reflected in frontend API layer and types.
3. Run lint/typecheck before pushing.
4. Update tracking docs when execution truth changes.

## Source-Of-Truth Docs

- `docs/` (architecture, DB schema docs, roadmaps)
- `FULLSTACK_INTEGRATION_TRACKER.md`
- `fayed-frontend-v1/fayed_master_system_gap_plan.md`

## Troubleshooting

- Migration issues: run backend `npm run prisma:generate` then `npm run prisma:migrate:dev`.
- CORS/local auth issues: verify frontend origin is included in backend `CORS_ORIGINS`.
- Port collisions: ensure backend and frontend are not sharing conflicting ports.

## License / Internal Use

Unless explicitly stated otherwise in sub-project metadata, treat this repository as internal project code.

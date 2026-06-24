# Sawiyaa Platform Monorepo

Production codebase for the Sawiyaa care platform, organized as a multi-app repository (backend, web frontend, mobile) with shared product and architecture documentation.

Current repo structure:

```text
sawiyaa-backend-v1
sawiyaa-frontend-v1
sawiyaa-mobile
docs
files
```

## What Is In This Repository

| Path | Purpose | Stack |
|---|---|---|
| `sawiyaa-backend-v1` | Main backend API | NestJS + Prisma + PostgreSQL |
| `sawiyaa-frontend-v1` | Main web app (admin + product surfaces) | Next.js + React + TypeScript |
| `sawiyaa-mobile` | Mobile app | Expo + React Native + TypeScript |
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
cd D:\Web\full-projects\sawiyaa\sawiyaa-backend-v1
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
cd D:\Web\full-projects\sawiyaa\sawiyaa-frontend-v1
npm install
npm run dev
```

### 3) Mobile (Optional During Web/Backend Work)

```powershell
cd D:\Web\full-projects\sawiyaa\sawiyaa-mobile
npm install
npm run start
```

## Common Commands

### Backend (`sawiyaa-backend-v1`)

- `npm run start:dev` - run NestJS in watch mode
- `npm run test` - run test suite
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript check
- `npm run prisma:migrate:dev` - apply/create dev migrations
- `npm run prisma:studio` - open Prisma Studio

### Frontend (`sawiyaa-frontend-v1`)

- `npm run dev` - run Next.js locally
- `npm run lint` - lint + i18n checks
- `npm run i18n:check` - translation integrity checks
- `npm run build` - production build (includes i18n check)

### Mobile (`sawiyaa-mobile`)

- `npm run start` - start Expo dev server
- `npm run android` - run Android target
- `npm run ios` - run iOS target
- `npm run typecheck` - TypeScript check

## Environment Configuration

Each app manages its own environment file(s):

- `sawiyaa-backend-v1/.env`
- `sawiyaa-frontend-v1/.env.local`
- `sawiyaa-mobile/.env` (if used by mobile setup)

Keep API base URLs aligned across frontend/mobile to the backend host and port.

## Development Workflow

1. Work inside the relevant app folder (`backend`, `frontend`, or `mobile`).
2. Keep contracts in sync: backend DTO/controller updates must be reflected in frontend API layer and types.
3. Run lint/typecheck before pushing.
4. Update tracking docs when execution truth changes.

## Source-Of-Truth Docs

- `docs/` (architecture, DB schema docs, roadmaps)
- `FULLSTACK_INTEGRATION_TRACKER.md`
- `sawiyaa-frontend-v1/fayed_master_system_gap_plan.md`

## Troubleshooting

- Migration issues: run backend `npm run prisma:generate` then `npm run prisma:migrate:dev`.
- CORS/local auth issues: verify frontend origin is included in backend `CORS_ORIGINS`.
- Port collisions: ensure backend and frontend are not sharing conflicting ports.

## LAN Development (Open Dev From Another Device)

If you want to open the dev frontend/backend from another device on the same network (phone/laptop):

1) Find your machine IP (example output will differ):

```powershell
ipconfig | Select-String -Pattern 'IPv4 Address'
```

2) Run the backend (default `PORT=7000` from `sawiyaa-backend-v1/.env`):

```powershell
cd D:\Web\full-projects\sawiyaa\sawiyaa-backend-v1
npm run start:dev
```

3) Run the frontend bound to your LAN interface:

```powershell
cd D:\Web\full-projects\sawiyaa\sawiyaa-frontend-v1
npm run dev:lan
```

4) From the other device, open:

- Frontend: `http://<YOUR_PC_IP>:3000`
- Backend (optional): `http://<YOUR_PC_IP>:7000/api/docs`

Notes:

- Frontend API calls use `NEXT_PUBLIC_API_URL=/api/v1` and Next.js proxies to the backend via `API_PROXY_TARGET`.
- If Windows Firewall blocks access, allow inbound TCP for ports `3000` and `7000`.

## License / Internal Use

Unless explicitly stated otherwise in sub-project metadata, treat this repository as internal project code.

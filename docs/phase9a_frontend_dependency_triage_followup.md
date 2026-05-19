# Phase 9A — Frontend Dependency Vulnerability Triage (Follow-Up)

Project: `D:\Web\full-projects\fayed\fayed-frontend-v1`  
Date: 2026-05-12  
Scope: Frontend dependency vulnerability triage + targeted upgrades only. No backend/mobile changes. No `npm audit fix --force`. No Next major/downgrade.

## Executive Verdict

**Completed.** Frontend `npm audit --audit-level=moderate` is now clean (**0 vulnerabilities**) with minimal, reviewable changes.

## Baseline Counts (Before)

Source: `docs/phase9a_frontend_remaining_audit_before.json`

- critical: 0
- high: 5
- moderate: 4
- low: 0

## Remediated Counts (After)

Source: `docs/phase9a_frontend_remaining_audit_after.json`

- critical: 0
- high: 0
- moderate: 0
- low: 0

## Triage Table (Package-by-Package)

| Package | Severity (Before) | Direct/Transitive | Parent(s) / Path | Runtime vs Dev/Build | Fix Applied | Remaining Risk | Production Blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `@babel/plugin-transform-modules-systemjs` | high | transitive | via `@svgr/webpack` → `@babel/preset-env` | dev/build | `package.json` `overrides` pinned to `7.29.4` | none | no |
| `ajv` | moderate | transitive | via `@eslint/eslintrc` / ESLint config chain | dev/build | `overrides` pinned to `6.15.0` | none | no |
| `brace-expansion` | moderate | transitive | via `minimatch` (multiple trees) | dev/build | `overrides` pinned to `2.0.3` globally, plus `@eslint/eslintrc` subtree pinned to `1.1.13` where needed | none | no |
| `flatted` | high | transitive | via `flat-cache` used by ESLint tooling | dev/build | `overrides` pinned to `3.4.2` | none | no |
| `minimatch` | high | transitive | via `@eslint/eslintrc` (3.x) and `typescript-eslint` (9.x) | dev/build | `overrides` pinned to `@eslint/eslintrc` → `minimatch@3.1.4` and `@typescript-eslint/typescript-estree` → `minimatch@9.0.7` | none | no |
| `postcss` (under Next) | moderate | transitive | previously `node_modules/next/node_modules/postcss` | build-time | Removed direct `postcss` devDependency and used `overrides` to force `postcss@8.5.14` (deduped/hoisted); verified `npm audit` clean | none | no |
| `svgo` | high | transitive | via `@svgr/plugin-svgo` | dev/build | `overrides` pinned to `svgo@3.3.3` | none | no |
| `xlsx` | high | direct | `dependencies.xlsx` and used in data-table export | runtime | **Removed** `xlsx` dependency and replaced XLSX export with CSV export | feature behavior changed (see below) | no (resolved) |

## `xlsx` Decision (Required)

Where used:
- `fayed-frontend-v1/src/components/ui/data-table/export-utils.ts`
- called by `fayed-frontend-v1/src/components/ui/data-table/DataTableExport.tsx`

Reads untrusted input:
- **No.** It was only used to **write/export** table rows to a generated file, not parse user-uploaded spreadsheets.

Action taken:
- Removed `xlsx` dependency from `fayed-frontend-v1/package.json`.
- Replaced XLSX export with **CSV export** (Excel-compatible) to remove the unpatched high-severity dependency.

Impact:
- Export output changed from `.xlsx` to `.csv`.
- Button copy changed to “Export CSV”.

Remaining risk:
- None from `xlsx` (dependency removed and `npm audit` is now clean).

## `postcss` under Next Decision (Required)

Why audit suggested force/downgrade:
- The vulnerable `postcss` instance was under `next` and `npm audit` suggested a path that included unacceptable changes (force/downgrade).

Safe mitigation attempted:
- Avoided `--force` and avoided downgrading Next.
- Forced patched `postcss@8.5.14` via `package.json` `overrides` and removed direct `postcss` devDependency so the tree could dedupe cleanly.

Result:
- `npm audit --audit-level=moderate` now reports **0 vulnerabilities**.

Is it a production blocker?
- **No** (resolved).

## Commands Run (This Follow-Up)

Baseline/paths:
- `npm audit --json | Out-File ..\\docs\\phase9a_frontend_remaining_audit_before.json`
- `npm ls @babel/plugin-transform-modules-systemjs ajv brace-expansion flatted minimatch postcss svgo xlsx`
- `rg -n "xlsx" -S src`

Remediation/verification:
- `npm install`
- `npm audit --json | Out-File ..\\docs\\phase9a_frontend_remaining_audit_after.json`
- `npm audit --audit-level=moderate` => **0 vulnerabilities**
- `npm run build` => **PASS**
- `npx tsc --noEmit` => **PASS**
- `npm run lint` => **FAIL** (expected; pre-existing lint debt, not addressed here)

## Lint Status (Not the Focus, But Recorded)

- `npm run lint` still fails with the same class of pre-existing React hooks/React Compiler rules violations (Phase 9A does not attempt to fix repo-wide lint debt).

## Files Changed

Frontend:
- `fayed-frontend-v1/package.json`
- `fayed-frontend-v1/package-lock.json`
- `fayed-frontend-v1/src/components/ui/data-table/export-utils.ts`
- `fayed-frontend-v1/src/components/ui/data-table/DataTableExport.tsx`

Docs/artifacts:
- `docs/phase9a_frontend_remaining_audit_before.json`
- `docs/phase9a_frontend_remaining_audit_after.json`

## Final Answer

- Are frontend dependency vulnerabilities still a production blocker? **No.**
- Remaining packages blocking production (frontend): **None** (audit clean at moderate threshold).
- Deferred/dev-only risks: **lint debt remains** (tracked separately; not part of dependency remediation).


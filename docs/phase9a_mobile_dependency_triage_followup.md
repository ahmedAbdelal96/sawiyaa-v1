# Phase 9A — Mobile Dependency Vulnerability Triage (Follow-Up)

Project: `D:\Web\full-projects\fayed\fayed-mobile`  
Date: 2026-05-12  
Scope: Mobile dependency vulnerability triage + targeted upgrades only. No backend/frontend changes. No `npm audit fix --force`. No Expo SDK major upgrade.

## Executive Verdict

**Mostly complete with remaining blocker:** `npm audit` is now clean (**0 vulnerabilities**), and typecheck/tests pass.  
However, **`npm run lint` still cannot run** because `eslint` is not installed (toolchain gap remains).

## Baseline Counts (Before)

Source: `docs/phase9a_mobile_npm_audit_before.json`

- critical: 0
- high: 20
- moderate: 9
- low: 1

## Remediated Counts (After)

Source: `docs/phase9a_mobile_npm_audit_after.json`

- critical: 0
- high: 0
- moderate: 0
- low: 0

## Key Remediation Strategy

We avoided Expo/RN major upgrades (as required) and instead:
- upgraded the direct runtime HTTP client (`axios`) to a patched version,
- applied `package.json` `overrides` to force patched transitive versions used by Expo/RN toolchains (CLI/config/metro).

This removed the vulnerability chain without changing Expo SDK major or React Native major.

## Packages Upgraded (Direct)

| Package | From (declared) | To (declared) | Reason | Risk |
| --- | --- | --- | --- | --- |
| `axios` | `^1.6.8` | `^1.16.0` | fixes multiple high-severity Axios advisories | low |

Note: `expo` and `react-native` were not intentionally upgraded by changing declared versions in `package.json`. Any patch resolution changes occurred within existing semver ranges during `npm install`.

## Overrides Added / Changed

File: `fayed-mobile/package.json`

| Package | Forced Version | Reason | Compatibility Risk |
| --- | --- | --- | --- |
| `@babel/plugin-transform-modules-systemjs` | `7.29.4` | fixes high advisory | low |
| `fast-uri` | `3.1.2` | fixes high advisory (AJV chain) | low |
| `postcss` | `8.5.14` | fixes moderate advisory (Metro/Expo chain) | low |
| `@xmldom/xmldom` | `0.8.13` | fixes high advisory (plist/xmldom chain) | low |
| `send` | `0.19.2` | fixes low advisory (`send<0.19.0`) without jumping to `send@1.x` | low |
| `fast-xml-parser` | `5.8.0` | fixes moderate advisory | medium (major for this lib; used by RN CLI tooling) |
| `tar` | `7.5.15` | fixes high advisory (`tar<=7.5.10`) without Expo major upgrade | medium (major from tar@6→7; used by CLI tooling) |

## Package-by-Package Triage (Former High/Moderate Highlights)

| Package | Severity (Before) | Direct/Transitive | Parent Path (Observed) | Runtime vs Dev/Tooling | Fix Applied | Remaining Risk | Production Blocker |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `axios` | high | direct | `dependencies.axios` | runtime | upgraded to `1.16.x` | none | no |
| `tar` | high | transitive | via `expo` → `@expo/cli` / `cacache` | tooling | override to `7.5.15` | none (audit clean) | no |
| `@xmldom/xmldom` | high | transitive | via Expo plist/config toolchain | tooling | override to `0.8.13` | none | no |
| `postcss` | moderate | transitive | via `@expo/metro-config` | tooling/build | override to `8.5.14` | none | no |
| `fast-xml-parser` | moderate | transitive | via `@react-native-community/cli-*` | tooling | override to `5.8.0` | none (audit clean) | no |

## Commands Run and Results

Baseline:
- `npm audit --json > ..\\docs\\phase9a_mobile_npm_audit_before.json`
- `npm audit --audit-level=moderate` (showed vulns)
- `npm ls --depth=8 > ..\\docs\\phase9a_mobile_npm_ls_depth8.txt`
- `npm audit --omit=dev --audit-level=moderate` (still showed toolchain vulns because they are installed as non-dev deps)

Remediation:
- `npm install` (after updating `axios` and adding `overrides`)

Verification:
- `npm audit --json > ..\\docs\\phase9a_mobile_npm_audit_after.json`
- `npm audit --audit-level=moderate` => **0 vulnerabilities**
- `npx tsc --noEmit` => PASS
- `npm test` => PASS (3 test suites, 40 tests)
- `npm run lint` => FAIL (`eslint` command missing)

## Phase 7C Security Guarantees (Re-Verified)

1. Secure token storage: **preserved**
- SecureStore-backed token storage code unchanged
- Tests still pass: `__tests__/auth/secure-token-storage.test.ts`

2. Role hardening: **preserved**
- Only PATIENT/PRACTITIONER supported; admin roles rejected
- Tests still pass: `__tests__/auth/role-hardening.test.ts`

3. Notification route hardening: **preserved**
- Rejects absolute/external and unsafe schemes; allowlist approach intact
- Tests still pass: `__tests__/auth/notification-route-hardening.test.ts`

4. API/network: **preserved**
- Production HTTPS enforcement remains in `src/lib/api.ts`
- Axios upgrade does not change the policy logic; tests still pass

## Remaining Vulnerabilities

None (`npm audit` clean at moderate threshold).

## Remaining Blockers / Gaps

- **Tooling gap:** `npm run lint` cannot run because `eslint` is not installed. This remains a release-process blocker if CI expects lint.
  - This phase did not install ESLint/config to avoid scope creep and potential repo-wide lint failures.

## Files Changed

- `fayed-mobile/package.json`
- `fayed-mobile/package-lock.json`
- `docs/phase9a_mobile_npm_audit_before.json`
- `docs/phase9a_mobile_npm_audit_after.json`
- `docs/phase9a_mobile_npm_ls_depth8.txt`

## Final Answer

- Are mobile dependency vulnerabilities still a production blocker? **No** (audit clean).
- If no, remaining dev-only/deferred risks: **lint toolchain gap remains** (ESLint missing).


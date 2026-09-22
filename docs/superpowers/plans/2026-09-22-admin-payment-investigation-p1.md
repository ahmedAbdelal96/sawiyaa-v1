# Admin Payment Investigation & Exception Workflow P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a read-only, permission-safe Admin payment investigation experience with safe session/failure projections, authoritative financial timeline, and an auditable exception queue.

**Architecture:** Extend the existing Admin payment operations read model rather than changing payment lifecycle code. Add a narrowly scoped operational-exception persistence model and controller, derive timeline/diagnosis from existing authoritative payment/session/accounting records, and keep the Web screens as thin consumers of those contracts.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Next.js/React, Jest/Vitest, existing permission and audit services.

**Spec:** User-provided “Admin Payment Investigation & Exception Workflow Closure — P1”.

## Global Constraints

- Do not change payment states, gateway behavior, wallet mutation, currency policy, or accounting posting rules.
- Use existing authoritative records only; never synthesize financial events.
- Do not expose raw provider payloads, secrets, clinical data, or broad patient-360 data.
- Preserve Arabic/English and RTL/LTR behavior.

## Review Focus

- Support agents can read only the support-safe session summary.
- Finance staff cannot gain broad patient access through payment investigation.
- Timeline contains only persisted authoritative records and remains ordered.
- Exception creation/resolution is auditable and idempotent.
- Failure diagnosis never exposes provider secrets or raw payloads.

### Task 1: Read-model contract tests

**Files:** Add backend unit tests beside the payment mapper/use case and Web component tests for the investigation sections.

- [ ] Write failing tests for support-safe session summary, safe failure diagnosis, and unified timeline ordering.
- [ ] Run targeted tests and confirm the new assertions fail for missing fields.

### Task 2: Operational exception persistence and API

**Files:** Prisma schema/migration; payment exception repository/service/controller; permission enum/guard tests.

- [ ] Add typed exception/status enums, payment relation, owner/reason/resolution fields, indexes, and audit records using existing security-audit infrastructure.
- [ ] Add authenticated list/detail/create/resolve endpoints with FINANCE_EVENTS_READ for reads and the existing financial write permission for mutations.
- [ ] Add tests for type/status/date/provider filters, ownership, audit logging, and role denial.

### Task 3: Extend Admin payment investigation projection

**Files:** payment repository, Admin payment use case/mapper/DTO, support-safe session endpoint.

- [ ] Project support-safe session summary, derived failure diagnosis, authoritative timeline, and exception summaries from persisted records.
- [ ] Keep metadata redacted and preserve existing payment/refund behavior.
- [ ] Add failing-then-passing tests for permissions and sensitive-field exclusion.

### Task 4: Web investigation and exception queue UX

**Files:** Admin payment detail/list screens, API client/types, exception queue route/screen, translations.

- [ ] Render state/problem/action hierarchy, safe session summary, failure diagnosis, timeline, and exception list/detail actions with loading/empty/error/permission states.
- [ ] Add queue filters and Open Case flow using the new API; no mobile Admin surface.
- [ ] Add Arabic/English and RTL/LTR tests.

### Task 5: Permission alignment and regression verification

- [ ] Align gateway-control read permissions with the frontend contract and add narrow finance payment-read permission only where required.
- [ ] Run backend targeted tests/typecheck/build and Web targeted tests/typecheck/build.
- [ ] Write the required closure artifact with exact commands, evidence, preserved rules, and remaining decisions.

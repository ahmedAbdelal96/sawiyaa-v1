# Mobile TypeScript Baseline Debt

## Audit date

30 July 2026.

## Command

```text
npx tsc --noEmit --incremental false
```

## Result

The command reports 89 errors. The Mobile package has no `typecheck` script; this direct command is the effective baseline.

All errors are outside the Session Code files changed in Phase 4B.5F. The changed Session Code component, helper, booking-success screen, translations, and focused tests do not appear in the error output.

## Classification

| Area | Representative errors | Classification | Session Code related? | Recommended action |
|---|---|---|---|---|
| Patient assessments | `TS7006`, `TS2345`, `TS7031` in assessment list/questions | Pre-existing typing gaps | No | Type API/query results and callback parameters in a dedicated cleanup |
| Patient discovery and matching | `TS7006` in filters, practitioner discovery, matching questions/results | Pre-existing typing gaps | No | Add explicit domain types; preserve runtime behavior |
| Patient care chat/support | `TS7006`, `TS2322` | Pre-existing typing gaps | No | Type request/message DTOs and translation return values |
| Patient payments/profile | `TS7006` | Pre-existing typing gaps | No | Type event/list callback values |
| Practitioner account/availability/onboarding | `TS7006`, `TS2322` | Pre-existing typing gaps | No | Type API responses and callback parameters; do not suppress with `any` |
| Practitioner finance | `TS7006` in finance and wallet screens | Pre-existing typing gaps | No | Align wallet/settlement response types in a separate financial debt task |
| Practitioner support/notifications | `TS7006` | Pre-existing typing gaps | No | Add explicit notification/message types |
| Shared feature components | `TS7006` in articles, instant booking, messaging, academy, package plans | Pre-existing typing gaps | No | Complete shared API contracts incrementally |

No `any` suppression, test disabling, or broad TypeScript cleanup was introduced for this audit. The Mobile TypeScript baseline must not be reported as green until these unrelated groups are resolved.

## Session Code conclusion

The Session Code rollout did not introduce a new TypeScript error. The shared Mobile Session Code component is lint-clean, its focused contract tests pass, and `expo-doctor` reports 17/17 checks passing.


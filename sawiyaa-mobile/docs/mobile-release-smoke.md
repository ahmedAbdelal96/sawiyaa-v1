# Sawiyaa mobile release smoke testing

Maestro flows in `.maestro/flows` target the standalone Android package `com.sawiyaa.mobile`; they are not Expo Go tests.

Use only deterministic development/test accounts:

```powershell
$env:PATIENT_EMAIL = "..."
$env:PATIENT_PASSWORD = "..."
$env:PRACTITIONER_EMAIL = "..."
$env:PRACTITIONER_PASSWORD = "..."
npm run verify:android-device
```

Required data: one disposable patient account, one disposable practitioner account, valid credentials for both, at least one visible practitioner for the patient browsing flow, and optionally one upcoming development session for session-detail/join screens. Payment flows are entry-only and must not be completed. No credentials or tokens belong in the repository.

| Flow group | Required deterministic data |
|---|---|
| Cold/public | No account; public home/discovery must be available |
| Patient shell/settings/support | `PATIENT_EMAIL`/`PATIENT_PASSWORD`; account can load shell and support list |
| Patient browse/details | At least one visible practitioner with a details route |
| Patient sessions | Patient account plus optional upcoming development session; no join/payment mutation |
| Patient messages | Patient account; an existing support conversation is preferred |
| Patient profile/picker | Patient account; picker cancellation is the expected safe path |
| Patient notifications/academy/payments | Patient account; empty-state or development records are acceptable; no real payment |
| Practitioner shell/settings/support | `PRACTITIONER_EMAIL`/`PRACTITIONER_PASSWORD`; account can load dashboard |
| Practitioner sessions/messages | Practitioner account plus optional development session/support conversation |
| Practitioner documents | Practitioner account with onboarding/documents entry visible; cancel picker without upload |
| Practitioner finance/notifications | Practitioner account; empty-state data is acceptable |

Before each flow run `npm run android-crash:clear`; after each flow run `npm run android-crash:check`. The post-flow check requires the app process to remain alive and inspects logcat plus Android exit-info. These checks supplement, rather than replace, Maestro assertions.

TypeScript validation is split into the changed-code gate and the repository baseline. The changed-code gate fails on new errors; three pre-existing errors in the practitioner dashboard/message thread are recorded by the gate and remain technical debt.

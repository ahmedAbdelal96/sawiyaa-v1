# Mobile release safety policy

An Android APK is distributable only when all required gates pass:

1. `npm run validate:production-api`
2. `npm run validate:mobile-runtime`
3. `npm run test:release-gate`
4. `npm run validate:changed-types`
5. Android bundle/export validation
6. `npm run verify:android-gradle`
7. `npm run verify:android-device` on a connected device with the required development accounts
8. No crash signatures or dead app process after any critical Maestro flow

There are no warning exemptions for deterministic runtime crashes. The repository’s unrelated TypeScript debt is recorded separately; new errors in this phase fail `validate:changed-types`.

Coverage status meanings:

- `AUTOMATED`: a named Maestro flow exists and is included in `verify:android-device`; it is not considered passed until run on the target standalone APK.
- `DATA-BLOCKED`: deterministic development data or valid route parameters are required; follow the row’s documented manual procedure before release.
- `MANUAL-BLOCKED`: no safe automated route exists yet; manually open the route on the Release APK and run `npm run android-crash:check` immediately afterward.

# Phase 7 Evidence Index — Mobile Full Audit (Patient + Practitioner)

**Phase:** 7
**Created:** 2026-06-17
**Evidence type:** Source code inspection, static analysis, route inventory
**Runtime verification:** Not performed (audit-only, no live server checks)

---

## 1. Agent Output Files

| Agent | Area | Status | Output File |
|-------|------|--------|-------------|
| Agent 1 | Route Inventory + Auth/Token Storage | ✅ Complete | `agent-1-route-auth.txt` |
| Agent 2 | Patient Mobile UX | ✅ Complete | `agent-2-patient-ux.txt` |
| Agent 3 | Practitioner Mobile UX | ✅ Complete | `agent-3-practitioner-ux.txt` |
| Agent 4 | Sessions / Payments / Wallet / Presence | ✅ Complete | `agent-4-sessions-payments-wallet.txt` |
| Agent 5 | Messages / Notifications / Push / Deep Links | ✅ Complete | `agent-5-messages-notifications.txt` |
| Agent 6 | i18n / RTL / Loading-Empty-Error States | ✅ Complete | `agent-6-i18n-rtl-states.txt` |

---

## 2. Inspected Routes / Screens

### (auth) Group — 7 routes
| File | Route Path | Notes |
|------|-----------|-------|
| `index.tsx` | `/` | Entry screen |
| `signin/patient.tsx` | `(auth)/signin/patient` | Patient email/password login |
| `signin/practitioner.tsx` | `(auth)/signin/practitioner` | Practitioner OTP login |
| `signup/patient.tsx` | `(auth)/signup/patient` | Patient registration |
| `signup/practitioner.tsx` | `(auth)/signup/practitioner` | Practitioner signup (redirects to web) |
| `forgot-password-patient.tsx` | `(auth)/forgot-password-patient` | Patient password reset |
| `practitioner-forgot-password.tsx` | `(auth)/practitioner-forgot-password` | Practitioner password reset |

### (patient) Group — 46 routes
Key routes inspected:
- `index.tsx` — patient home/dashboard
- `sessions.tsx` — patient sessions list
- `sessions/[id].tsx` — session detail (join gate, chat availability, payment states)
- `sessions/[id]/pay.tsx` — session payment/checkout
- `sessions/[id]/payment-return.tsx` — payment return handler
- `sessions/[id]/cancel-preview.tsx` — cancellation preview
- `sessions/confirm.tsx` — booking confirmation
- `sessions/select-time.tsx` — time selection
- `sessions/success.tsx` — post-booking success **[AUDIT-105]**
- `payments.tsx`, `payments/transactions.tsx` — payment hub
- `discovery/index.tsx`, `discovery/[slug].tsx`, `discovery/filters.tsx`
- `messages/index.tsx`, `messages/[id].tsx` — messages shell
- `support/index.tsx`, `support/[id].tsx`, `support/new.tsx` **[AUDIT-106]**
- `care-chat/index.tsx`, `care-chat/[id].tsx`, `care-chat/request/[id].tsx`, `care-chat/new.tsx`
- `instant-booking.tsx` — patient instant booking
- `notifications.tsx` — notification list
- `profile.tsx`, `profile-details.tsx`, `profile-details/edit.tsx`
- `profile-preferences.tsx`, `profile-notifications.tsx` **[AUDIT-107]**
- `package-purchases/*` — 5 routes
- `academy/*` — 6 routes
- `assessments/*` — 4 routes
- `matching/*` — 3 routes

### (practitioner) Group — 22 routes
Key routes inspected:
- `index.tsx` — practitioner dashboard **[AUDIT-116]**
- `sessions/index.tsx`, `sessions/[id].tsx` — practitioner session list/detail
- `availability/index.tsx` — availability editor **[AUDIT-115]**
- `instant-booking.tsx` — practitioner instant booking requests
- `finance/index.tsx`, `finance/wallet.tsx`, `finance/ledger.tsx`, `finance/settlements.tsx`
- `messages/index.tsx`, `messages/[id].tsx` — practitioner messages
- `support/index.tsx`, `support/[id].tsx`, `support/new.tsx`
- `care-chat/index.tsx`, `care-chat/[id].tsx`, `care-chat/request/[id].tsx` **[AUDIT-110]**
- `account.tsx` — account settings
- `onboarding.tsx` — onboarding workspace **[AUDIT-113, AUDIT-114]**
- `application-status.tsx` — application status **[AUDIT-112]**
- `notifications.tsx` — practitioner notification list
- `promo-codes.tsx`, `more.tsx`

### Root Group — 2 routes
- `index.tsx` — splash/entry redirect
- `+not-found.tsx` — 404 handler

---

## 3. Inspected Components / Hooks / Utils

### Auth / Token Storage
- `fayed-mobile/src/features/auth/secure-token-storage.ts` — SecureStore/AsyncStorage token storage
- `fayed-mobile/src/features/auth/storage.ts` — device ID generation, session metadata
- `fayed-mobile/src/providers/AuthProvider.tsx` — centralized auth guard, segments-based redirect, refresh logic, logout
- `fayed-mobile/app/(auth)/signin/practitioner.tsx` — OTP challenge/verify flow
- `fayed-mobile/app/(patient)/_layout.tsx` — patient tabs with hidden routes
- `fayed-mobile/app/(practitioner)/_layout.tsx` — practitioner tabs with APPROVED gate

### Sessions / Join / Daily
- `fayed-mobile/app/(patient)/sessions/[id].tsx` — patient session detail
- `fayed-mobile/app/(practitioner)/sessions/[id].tsx` — practitioner session detail
- `fayed-mobile/src/features/patient/sessions/api.ts` — session API calls
- `fayed-mobile/src/lib/external-url.ts` — `normalizeAllowedExternalUrl` URL validation

### Payments / Wallet
- `fayed-mobile/app/(patient)/sessions/[id]/pay.tsx` — payment checkout
- `fayed-mobile/app/(patient)/sessions/[id]/payment-return.tsx` — payment return handler
- `fayed-mobile/src/features/patient/payments/return-utils.ts` — `normalizePaymentRedirectStatus`
- `fayed-mobile/src/features/practitioner/finance/utils.ts` — `formatMoney`, `safeFinanceText`, `settlementStatusLabel`

### Presence / Availability
- `fayed-mobile/app/(practitioner)/availability/index.tsx` — availability editor
- `fayed-mobile/src/features/practitioner/presence/hooks.ts` — `usePractitionerPresenceHeartbeat`

### Messages / Notifications
- `fayed-mobile/src/features/messages/` — unified Messages Shell feature
  - `components/MessagesInboxScreen.tsx` — 4-tab inbox
  - `components/MessageThreadScreen.tsx` — chat bubbles + composer (chatAvailability gating)
  - `utils.ts` — `getParticipantStatusLabel`, `getConversationStatusLabel`, `getMessageStatusLabel`
- `fayed-mobile/src/features/patient/notifications/routes.ts` — patient notification route resolver
- `fayed-mobile/src/features/practitioner/notifications/utils.ts` — practitioner notification route resolver
- `fayed-mobile/src/features/push/service.ts` — `syncPushRegistration`, `revokeCurrentPushRegistration`
- `fayed-mobile/src/features/push/storage.ts` — push registration storage

### i18n / RTL
- `fayed-mobile/src/i18n/locales/en.json` — English translations (verified `practitioner.presentationStatus` present)
- `fayed-mobile/src/i18n/locales/ar.json` — Arabic translations
- `fayed-mobile/src/i18n/direction.ts` — `getAppDirection`, `isCurrentLanguageRtl`
- `fayed-mobile/src/features/patient/profile/account-utils.ts` — `formatNotificationType` **[AUDIT-107]**

### State Components
- `fayed-mobile/src/components/ui/PageScaffolds.tsx` — `ListPageScaffold`, `DetailPageScaffold`

---

## 4. Inspected i18n Files

| File | Key Findings |
|------|-------------|
| `src/i18n/locales/en.json` | `practitioner.presentationStatus` confirmed present (9 statuses). `patientSessionsFlow.presentationStatus` has duplicate entry at line 792 and 2319. |
| `src/i18n/locales/ar.json` | `practitioner.presentationStatus` confirmed present (9 Arabic statuses). |
| `en copy.json`, `ar copy.json` | Backup files present — not inspected |

---

## 5. Inspected Expo Config

### app.json
- `scheme: "fayed"` — deep link scheme declared
- `plugins: ["expo-router", "expo-localization", "expo-notifications", "expo-secure-store"]` — all required plugins present
- `expo-notifications` declared as plugin (not module)
- No explicit EAS projectId in `app.json` (falls back to `Constants.easConfig?.projectId`)

### package.json
- Expo SDK 51 (`expo: ~51.0.14`)
- `expo-router: ~3.5.16`
- `expo-secure-store: ~13.0.2`
- `expo-notifications: ~0.28.19`
- `expo-localization: ~15.0.3`
- `react-native: 0.74.5`
- `zustand: ^4.5.2` — state management
- `@tanstack/react-query: ^5.28.9`

---

## 6. Commands / Tools Used

- **Glob** — route file enumeration (`fayed-mobile/app/**/*`)
- **Grep** — pattern search across TSX/JSON files
- **Python JSON parse** — verified `practitioner.presentationStatus` existence in both locales
- **Static analysis** — no runtime checks performed

---

## 7. Screenshots / Artifacts

No screenshots were taken. All evidence is file-path and line-number based.

---

## 8. Runtime Checks

**Skipped.** No runtime verification was performed because:
- Audit phase is read-only discovery
- No test credentials were provided
- No mutation permissions were granted
- Mobile app requires physical device or simulator for full runtime verification

Static code analysis confirmed all findings. Runtime checks would be needed to verify:
- Actual notification tap routing behavior
- Payment return state rendering
- Join CTA visibility under different `presentationStatus` values
- RTL layout on physical Arabic-device

---

## 9. Limitations

1. **Runtime not verified** — All findings are based on static source inspection. Actual user-visible rendering was not confirmed.
2. **Translation file keys not exhaustively verified** — AUDIT-105 finding (raw payment enums) assumes the i18n key `patientSessionsFlow.statuses.PENDING_PAYMENT` is absent, but this was not verified by exhaustive key existence check in both locale files.
3. **`cleanReasonText` prefix coverage** — Only the two-variant regex was inspected. Full backend rejection reason prefix format was not verifiable from mobile source.
4. **`formatRequirementLabel` scope** — Only dashboard and onboarding were inspected. Other uses of this utility may exist in the codebase.
5. **Web-specific behavior** — AsyncStorage token storage risk is documented but web-specific security controls (Content Security Policy, XSS protection) were not audited.
6. **Backend auth enforcement** — Client-side practitioner APPROVED gate was verified. Backend enforcement of the same was not verifiable from mobile source.
7. **Notification payload schema** — The exact fields populated by the backend for each notification type were not verifiable from mobile source.

---

## 10. Duplicate Route Check

**No duplicate routes found in mobile app.** The route structure is clean with no overlapping paths across (auth)/(patient)/(practitioner) groups. The web frontend Phase 6 audit found `admin/sessions/runtime-inspection/` vs `runtime-inspector/` duplicates, but the mobile app has no such duplication.

---

*Evidence index produced by Phase 7 read-only audit. No application code was modified.*

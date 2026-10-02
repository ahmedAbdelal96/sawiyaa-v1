# Native module mount-time audit

| Module | Production usage | Import/render timing | Gate decision |
|---|---|---|---|
| `expo-crypto` | `src/lib/mobile-uuid.ts` | Called only by UUID/idempotency initialization or message send path | Safe native API; covered by unit test with browser crypto absent |
| `expo-secure-store` | `src/features/auth/secure-token-storage.ts` | Storage calls after provider/auth operations | Safe; no module-level token read |
| `expo-notifications` | `src/providers/AuthProvider.tsx`, `src/features/push/service.ts` | Registration/permission work is event/effect-driven | Safe; no permission prompt during render |
| `expo-image-picker` | `app/(patient)/profile-details.tsx` | Permission and picker calls occur after explicit user interaction | Safe |
| `expo-document-picker` | `app/(practitioner)/onboarding.tsx` | Picker call occurs after explicit user interaction | Safe |
| `expo-web-browser` | Payment and auth screens | `maybeCompleteAuthSession()` is intentional module initialization; browser session opens after user action | Allowed and documented |
| `expo-localization` | `src/i18n/index.ts` | Locale read during i18n bootstrap | Supported native API |
| `expo-device` | `src/features/push/service.ts` | Read during push registration | Supported native API |
| `expo-application` | No production usage found | N/A | No audit action |
| `expo-file-system` | No production usage found | N/A | No audit action |

No confirmed unsafe mount-time native module call was found in this phase.

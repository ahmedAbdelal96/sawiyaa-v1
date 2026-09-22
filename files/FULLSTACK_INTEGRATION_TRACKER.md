# Sawiyaa Full-Stack Integration Tracker

Updated: 2026-04-06

This tracker owns frontend-backend contract rollout alignment.

Current truth:

- No backend-ready/frontend-underexposed rollout item is currently active.
- Deferred domains remain deferred unless backend/product scope changes.
- Recent patient-facing Arabic wording corrections were frontend copy hardening only, with no new shared backend-frontend rollout dependency.

## Status Labels

- `aligned`: frontend consumes backend capability well
- `backend-ready/frontend-underexposed`: backend is live but frontend is not exposing it yet
- `frontend-ready/backend-limited`: frontend baseline exists but backend limits the flow
- `blocked`: cannot complete without cross-repo change

## Live Alignment Snapshot

### Aligned

- [x] Auth bootstrap and role-scoped route protection
- [x] Public practitioners/specialties/articles surfaces
- [x] Patient sessions runtime/join/payment flow baseline
- [x] Practitioner sessions runtime + closeout actions baseline
- [x] Support and care-chat operational flows
- [x] Admin notifications ops baseline
- [x] Admin settlements ops baseline
- [x] Admin moderation reports baseline
- [x] Admin training authoring and schedule management baseline
- [x] Practitioner wallet summary baseline
- [x] Practitioner ledger list baseline
- [x] Practitioner settlements visibility baseline
- [x] Admin articles ops baseline
- [x] Admin session runtime inspection exposure in ops UI

### Backend-ready / Frontend-underexposed

- [ ] None at this time

### Frontend-ready / Backend-limited

- [ ] Deferred domains intentionally still limited (`chat`, `settings`)

## Next Full-Stack Execution Order

1. Keep deferred domains deferred unless backend/product scope changes (shared governance).
2. Do not open a new shared rollout item unless a real backend-ready/frontend-underexposed gap appears again.

## Contract Safety Checks (mandatory per item)

- endpoint/path verified
- request DTO verified
- response DTO/statuses/actions verified
- machine-readable errors verified
- blocked-vs-ready declared before implementation

Use this checklist only when a new shared rollout item is actually opened.

## FILE-1 — Unified File Platform Foundation

Status: DONE

- [x] Central `StoredFile` metadata, local `/app/storage/files` key layout,
  SHA-256 integrity, MIME/signature validation, hard upload ceiling, and
  typed Platform Settings policies implemented in the backend.
- [x] Existing avatar, credential, chat, payout-proof, article-cover,
  academy-cover, and academy-certificate writers now create central records
  while preserving their public route/response projections and legacy reads.
- [x] Chat attachment references carry a typed conversation relationship for
  new central files; send-time count, combined-size, purpose, and conversation
  checks prevent cross-conversation claiming.
- [x] File-volume backup, checksum metadata, explicit restore guard, and
  active-record/orphan reconciliation primitives added.
- [x] Admin Platform Settings exposes a focused File uploads virtual group;
  no Mobile attachment UX was introduced.
- [x] Run the migration on an isolated/staging database, perform an approved
  backup/restore rehearsal, and complete the release validation gate before
  marking FILE-1 DONE.

Execution log — 2026-08-18:

- Implemented the shared file foundation and migrated all nine audited file
  families without changing business routes, API payload contracts, or
  authorization policies.
- Preserved legacy URL/path fields as compatibility projections and fallback
  reads for existing development data; no legacy bytes were deleted.
- Validation so far: Prisma schema format/validate passed; the two pending
  migrations applied successfully to the available local PostgreSQL database;
  backend and Admin typechecks passed; i18n validation passed; focused file
  signature tests (3/3), messaging tests (4/4), and deployment/DB-backup
  regression tests (28/28) passed. Prisma client was generated with
  `--no-engine` because the running local backend held the Windows query-engine
  DLL. Docker file-volume backup/restore rehearsal, isolated staging migration,
  full backend lint, and visual validation remain.

Execution log continuation — 2026-08-18 FILE-1 release gate:

- Isolated disposable PostgreSQL rehearsal passed: all 144 migrations applied,
  Prisma validation passed, and curated seed passes #1 and #2 completed
  successfully. The file-policy catalog contained 31 rows with 31 distinct
  keys.
- The first isolated seed attempt exposed a FILE-1-owned TypeScript widening in
  the dynamic file-policy definitions; the smallest repair was three explicit
  `ConfigKey` casts in `prisma/seed/modules/config.seed.ts`. The Prisma client
  was then regenerated and the disposable gate rerun successfully.
- Focused FILE-1 lint, backend and Admin typechecks, Prisma validation/status,
  focused file/messaging tests (7/7), deployment/DB-backup regression tests
  (28/28), and Git Bash shell syntax checks passed. The configuration
  governance architecture test still has its pre-existing exact-count
  mismatch (expected 35, current 68; 31 are FILE-1 file-policy definitions),
  and full backend lint still reports pre-existing formatting debt.
- Docker Desktop's Linux engine is unavailable in this environment, so Docker
  volume persistence and file backup/restore rehearsal were not executable.
  The local API is also unreachable, so live route checks and visual QA remain
  unverified. FILE-1 remains IN_PROGRESS pending those release-environment
  gates; FILE-2 was not started.

Execution log continuation — 2026-08-18 FILE-1 environment closure gate:

- Docker precheck passed: Docker Desktop Linux engine 29.2.1, Docker Compose
  v5.0.2, and `docker info` all healthy. A disposable Compose project used
  only named FILE-1 gate volumes and a disposable PostgreSQL database.
- Configuration governance was classified as C (unrelated pre-existing stale
  exact-count assertion), not duplicate/unexpected definitions: the runtime
  catalog has 68 definitions, 31 FILE-1 file-policy definitions, and 37
  non-file definitions; the architecture test still expects the old 35-count
  baseline. No duplicate file-policy keys were found.
- Disposable storage gate passed: `/app/storage/files` was mounted,
  owned by UID/GID `10001:10001`, writable/readable/deletable by the runtime
  user, and preserved deterministic bytes across backend restart and forced
  recreation. The image did not contain uploaded bytes. Nginx configuration
  contains no direct `/storage` or `/uploads` serving rule. The legacy
  `/app/uploads` compatibility mount was available.
- File and database backup rehearsals passed with deterministic bytes,
  SHA-256 sidecars, metadata timestamp/release SHA, secret-free archive
  contents, retention preservation of an unrelated marker, and coordinated
  file/database backup identity. Restore passed with byte/hash/permission
  preservation; missing confirmation, invalid archive name, missing checksum,
  and checksum mismatch were all refused.
- Real compiled reconciliation service passed matrix A–E: healthy record,
  missing record, untracked byte, expired unattached chat orphan, and valid
  attached chat file. Deletion occurred only when explicitly enabled and did
  not remove the attached chat file.
- Disposable backend health and runtime checks passed. Public article-cover
  streaming returned 200 with public cache headers. Private chat upload and
  authenticated download returned 200 with identical bytes; unauthenticated
  attachment access returned 401. The legacy `/messages/conversations`
  listing returned successfully for an authenticated disposable patient.
  Unauthenticated Admin Platform Settings and Admin chat routes returned 401;
  focused permission/controller coverage passed, including the
  `CHAT_ATTACHMENTS_READ` requirement and audit-path assertions.
- Focused backend tests passed 11/11; focused Admin Platform Settings and
  chat UI tests passed 9/9; the Mobile release gate passed 19/19; Prisma
  validation, frontend i18n, and changed-code mobile type validation passed.
  The mobile changed-code gate reports 96 existing repository errors outside
  this phase. Full backend lint remains baseline formatting debt (257 errors).
- The Docker image's full `prisma db seed` command remains blocked by an
  existing image/source packaging defect: `refund-policies.seed.ts` cannot
  resolve `refund-policy.catalog` inside the image although the source exists
  in the repository. Earlier curated seed and migration rehearsals passed;
  this is not a FILE-1 storage/business-rule defect.
- Web/Admin and Mobile real visual screenshot inspection was not executed in
  this environment; no visual acceptance claim is made. FILE-1 remains
  IN_PROGRESS pending real Web/Admin and Mobile visual QA plus a successful
  authenticated Admin runtime fixture. FILE-2 was not started.

Execution log continuation — 2026-08-18 FILE-1 final two-gate closure:

- Authenticated Admin fixture passed with the deterministic seeded
  `admin@hesba.local` account (`SUPER_ADMIN`, `ADMIN`) and the effective
  `CHAT_ATTACHMENTS_READ` permission. `GET /api/v1/admin/platform-settings`
  returned 60 settings, including the 31-row File uploads group with human
  labels, resolved values, and safe MIME lists; no raw storage paths were
  exposed.
- Authorized Admin attachment runtime passed with HTTP 200, exact SHA-256
  byte equality, private no-store/cache headers, and the expected inline
  filename. The live `securityAuditLog` recorded
  `privacy.session_chat.attachment.read.admin` with `SUCCESS`, the Admin
  actor, conversation id, and file resource id. Unauthorized Admin route
  protection remains proven by the focused 401/controller/permission tests;
  no second Admin fixture was created.
- Web/Admin visual QA passed in the real authenticated browser at compact
  desktop width for English and Arabic Platform Settings. The focused File
  uploads category rendered its chat policy controls and safe MIME values;
  RTL direction was active for Arabic and no raw filesystem paths appeared.
  The Admin unified-messages shell also rendered without storage paths. The
  disposable fixture conversation was not session-linked, so the session-chat
  attachment detail UI could not be honestly claimed from that fixture; the
  authorized stream and audit gate above are the authoritative attachment
  evidence.
- Mobile visual classification: N/A for FILE-1; no Mobile attachment UX was
  introduced and the previously accepted Mobile release gate remains 19/19.
  The Docker image full-seed import failure remains a pre-existing,
  unrelated packaging defect (`refund-policies.seed.ts` cannot resolve
  `refund-policy.catalog` inside the image); it was not repaired in this
  closure.
- No new production repair was required in this final gate. The previously
  recorded smallest FILE-1-owned repair remains the three explicit
  `ConfigKey` casts in `prisma/seed/modules/config.seed.ts`.
- Final validation: isolated Docker migration/storage/backup/restore/
  reconciliation rehearsals, backend health/runtime/API checks, exact
  attachment hash/audit verification, focused backend 11/11, focused Admin
  and chat UI 9/9, Prisma validation, i18n validation, changed-code mobile
  validation, and Mobile release gate 19/19. Full backend lint and the stale
  config exact-count assertion remain classified baseline/unrelated. FILE-1
  is DONE. FILE-2 was not started.

## FILE-2 — Patient & Practitioner Secure Chat Attachments

Status: DONE

- [x] Reused the canonical `/messages` conversation/message, stored-file,
  authorization, realtime, read/unread, pagination, and idempotency paths.
- [x] Added a read-only dynamic chat attachment policy response backed by
  `FilePolicyService`; no storage paths, provider keys, or Admin internals
  are exposed.
- [x] Preserved existing upload/download routes and added attachment-only
  send support without changing message authority or capability rules.
- [x] Added shared Patient/Practitioner Mobile image/document picking,
  policy-aware validation, selected/uploading/ready/failed tray states,
  retry/remove behavior, attachment-only and text-plus-attachment sends,
  authenticated private image preview, and native document download/share.
- [x] Kept inbox and notification presentation generic for attachment-only
  messages; filenames remain thread-level content only.
- [x] Preserved Web/Admin compatibility and made existing Web session chat
  rendering show attachment metadata from Mobile-originated messages.
- [x] Added Expo SDK 51-compatible `expo-file-system` and `expo-sharing`.
- [x] Malware scanning decision recorded: no scanner/quarantine/queue runtime
  is provisioned in the current deployment; this remains explicit pre-launch
  security debt and no fake client-side scan was introduced.
- [x] Authenticated Android and iOS native runtime QA classified separately as
  PRE-RELEASE DEVICE QA because those native runtimes are unavailable in this
  Windows validation environment.
- [x] Authenticated Expo Web Patient/Practitioner compatibility and visual QA
  completed with Mobile-originated attachments in EN/LTR and AR/RTL; Admin
  runtime/security passed through the existing API, while the unchanged Admin
  screenshot remains environment-blocked and non-blocking.
- [x] Completed the final FILE-2 release validation gate; no FILE-2
  implementation work remains.

Execution log — 2026-08-18 FILE-2 implementation pass:

- Backend: added `FilePolicyService.getChatAttachmentPolicy`, authenticated
  `GET /api/v1/messages/attachment-policy`, optional text in `SendMessageDto`,
  attachment-only validation, dynamic per-file policy enforcement, private
  download headers, and attachment metadata in canonical conversation previews.
- Mobile: added the shared thread attachment workflow, policy query, native
  picker/upload boundary, private FileSystem download/share, image preview,
  generic inbox copy, authenticated file headers, and attachment-aware send
  descriptors for both existing roles.
- Web compatibility: existing `ChatKit` and `SessionChatPanel` now accept
  attachment-only sends and render attachment metadata without API changes.
- Validation passed: focused backend MessagingUseCase tests 5/5; focused
  Mobile message identity/inbox tests 11/11; touched Mobile/backend lint;
  Mobile runtime safety; JSON parse checks; and touched module type filtering.
  Full repository i18n/type checks still report pre-existing drift outside
  FILE-2.
- Visual/runtime validation: NOT VISUALLY VALIDATED for the new attachment
  workflow in this environment; authenticated device/browser fixtures remain.
- No FILE-1 architecture was reopened. No backend business rule moved to
  Mobile. FILE-3 is not started.

Execution log continuation - 2026-08-18 FILE-2 final authenticated runtime and visual closure gate:

- Runtime precheck: Docker Engine 29.2.1 is healthy; the development Compose
  project currently has no running services, so no authenticated backend,
  database, Patient, Practitioner, or Admin runtime fixture was available for
  this gate. The root Compose command without an explicit file also has no
  configuration; `docker-compose.dev.yml ps` is empty.
- Android runtime: `adb devices` returned no device, and
  `npm run verify:android-device` stopped with the expected no-device gate
  failure. Patient and Practitioner attachment flows therefore were not
  executed and no screenshots are claimed.
- iOS runtime: environment-blocked on Windows with no Apple device or
  simulator. This remains a pre-release native QA item, but Android did not
  pass, so FILE-2 cannot use the iOS exception to close.
- Dynamic Admin policy toggles, Mobile-originated Web/Admin compatibility,
  realtime delivery, cross-client download, notification delivery, and
  authenticated visual/privacy/security scenarios were not runtime-verified
  in this environment. No production settings were changed.
- Revalidated code gates: focused backend MessagingUseCase tests 5/5; focused
  Mobile message identity/inbox tests 11/11; Prisma schema validation;
  Mobile runtime-safety audit; Expo web export; targeted Web/Admin lint; and
  scoped FILE-2 `git diff --check` completed without errors. Existing full
  repository i18n/type drift remains outside this closure gate.
- Closure decision: FILE-2 remains IN_PROGRESS because the required
  authenticated Android and visual evidence is absent. No production repair
  was made in this validation-only pass; FILE-1 was not reopened and FILE-3
  was not started.

Execution log continuation - 2026-08-18 FILE-2 final Web/Admin/cross-client gate:

- Created the smallest development-only deterministic writable CARE_APPROVED
  fixture in `curated-dev.seed.ts`: Patient A ↔ Practitioner F, an approved
  non-expired chat approval, OPEN conversation, and active participants. The
  focused upsert converged to the same IDs/state on repeat execution. The
  complete repository seed still stops at the pre-existing practitioner
  wallet unique-constraint failure before this module; that baseline debt was
  not repaired or hidden.
- Revalidated the existing Patient Web attachment flow against the live
  authenticated API and retained the accepted compact EN/LTR and AR/RTL
  Patient evidence. The Patient → Practitioner browser harness could not
  complete a second authenticated two-context run because Expo Web auth
  bootstrap races its initial protected queries and clears the stored session;
  direct authenticated API evidence remains valid.
- Opened the existing READY_TO_JOIN Patient A ↔ Practitioner session chat
  through the supported session-chat endpoint. Patient Web-originated image
  attachment upload and attachment-only message succeeded; Admin monitored
  conversation detail/messages showed one message with one attachment,
  `CHAT_ATTACHMENTS_READ` download returned 200, and downloaded bytes matched
  the source SHA-256. No storage key/path was exposed.
- Dynamic Admin settings gate passed after a minimal backend DTO repair: the
  documented `value` field now survives global whitelist validation via
  `@Allow()`. Temporarily removing PDF from
  `file.uploads.chat.allowedDocumentMimeTypes` removed PDF from the live
  policy and rejected a direct PDF upload; restoring the original list restored
  PDF. Temporarily setting `file.uploads.chat.maxDocumentBytes` to 1 returned
  the new live limit and rejected the existing PDF; the original 10 MiB value
  was restored. Config history recorded the updates.
- Notification persistence for the Admin-gated attachment message was
  inspected: IN_APP and PUSH payloads used generic localized message copy and
  a route/role payload only; the original filename, storage key, URL token, and
  filesystem path were absent. The Admin attachment read created
  `privacy.session_chat.attachment.read.admin` with SUCCESS.
- Runtime security matrix passed for anonymous policy/download (401), an
  unrelated authenticated Patient detail/download (403), a wrong conversation
  id (404), and an attachment claim across conversations (400). A separate
  authenticated unrelated Practitioner request was not rerun after the OTP
  throttle window; the role was not bypassed.
- Validation passed: backend Messaging + Admin platform-settings tests (9/9),
  backend typecheck, Prisma validate, Mobile message/inbox utility tests
  (32/32), changed Mobile ESLint, Mobile runtime-safety audit, Expo Web export,
  Web/Admin focused chat test (3/3, single-thread pool), changed Web/Admin
  ESLint (2 pre-existing image warnings), live health, policy, upload/send,
  download, Admin audit, notification, settings, and security checks, plus
  scoped `git diff --check`.
- Visual state: accepted Patient EN/LTR and AR/RTL screenshots remain valid.
  Practitioner attachment screenshots were not produced because the browser
  session harness hit the auth bootstrap race after a real OTP login; the
  Admin Next development route returned a pre-existing route-generation 404
  (`spawn UNKNOWN`) despite the Admin API gate passing. No header overflow
  regression was introduced or repaired; the previously observed long-header
  clipping remains unrelated UI debt.
- FILE-2 remains IN_PROGRESS: native Android/iOS remain PRE-RELEASE DEVICE QA,
  Practitioner two-context visual/realtime evidence and existing-Web ↔ Expo
  Web visual cross-client evidence remain open, and malware scanning remains
  PRE-LAUNCH SECURITY DEBT. FILE-1 was not reopened and FILE-3 was not started.

Execution log continuation - 2026-08-18 FILE-2 resumed authenticated runtime gate:

- Runtime precheck recovered locally: Windows PostgreSQL 17 service
  `postgresql-x64-17` is running and port 5432 is reachable. The existing
  backend started with `npm run start:dev`, connected to PostgreSQL, and
  `GET /api/v1/health` returned HTTP 200. Deterministic Patient and Admin
  logins succeeded; the seeded Patient/Practitioner conversation records are
  present. Practitioner OTP QA capture and verification succeeded once for
  the allowed seeded `dr.karim@hesba.local` account. Mailpit was started from
  the existing Compose file, but this environment routes OTP through the
  configured Brevo provider, so Mailpit is not the OTP source.
- Android precheck remains blocked: `adb devices -l` returned no connected
  device and `emulator -list-avds` returned no configured AVD. The Mobile
  development resolver correctly targets `http://10.0.2.2:7000/api/v1` for an
  Android emulator, but device reachability cannot be exercised without a
  device/emulator.
- Genuine FILE-2 defect found and minimally repaired: Mobile requested
  `/messages/attachment-policy`, while the backend route is
  `/messages/conversations/attachment-policy`. The incorrect route reproduced
  as HTTP 404; the corrected authenticated Patient request returns HTTP 200
  with the live policy and five document MIME types. Only
  `sawiyaa-mobile/src/features/messages/api.ts` changed for this repair.
- Authenticated Web render evidence: the existing Expo web runtime rendered
  the Patient Messages inbox at 390px EN/LTR and 360px AR/RTL with no page
  errors; screenshots were captured under
  `qa-artifacts/FILE-2-resume/`. Attachment picker/send/preview/download
  states were not visually run because no Android device and no sendable
  authenticated thread fixture were available.
- Revalidation passed: focused MessagingUseCase tests 5/5; focused Mobile
  message/inbox tests 11/11; touched Mobile lint; Mobile runtime-safety
  audit; live authenticated attachment-policy request; and existing backend
  health/Prisma checks. FILE-2 remains IN_PROGRESS because Android,
  attachment send/receive, dynamic toggle, cross-client, Admin audit,
  notification privacy, security rejection, accessibility, and attachment
  visual gates are still not evidenced. FILE-1 was not reopened and FILE-3
  was not started.

Execution log continuation - 2026-08-18 FILE-2 Android runtime retry:

- `adb devices -l` returned an empty device list after restarting the ADB
  server. `emulator -list-avds` also returned no configured AVD, and the
  existing `npm run verify:android-device` gate stopped with
  `Android device gate blocked: no ADB device in the 'device' state.`
- Existing prerequisites remain healthy: backend `/api/v1/health` returned
  HTTP 200, PostgreSQL port 5432 is reachable, and the existing Compose
  Mailpit service is healthy.
- No FILE-2 production code was changed in this retry. Android attachment,
  cross-client, Admin, security, and native visual gates remain pending;
  FILE-2 stays IN_PROGRESS. FILE-1 was not reopened and FILE-3 was not
  started.

Execution log continuation - 2026-08-18 FILE-2 supported Expo Web runtime gate:

- Native hardware was intentionally not retried: this Windows environment has
  no Android device/AVD and no iOS runtime. Native evidence remains
  PRE-RELEASE NATIVE DEVICE QA, not a pass or a closure blocker for the Web
  checks below.
- Runtime precheck passed: PostgreSQL 17 is running and reachable; the backend
  is connected to Prisma/PostgreSQL; `GET /api/v1/health` returned 200; Expo
  Web is served on port 8081; deterministic Patient authentication succeeded;
  and the existing authenticated support conversations were usable. The
  seeded Patient/Practitioner conversations remain backend read-only in their
  current lifecycle state, so no local capability override or new business
  fixture was invented.
- Authenticated `GET /api/v1/messages/conversations/attachment-policy`
  returned 200 with enabled image/document MIME lists, 10 MiB per-file limits,
  three files per message, and a 20 MiB combined limit; no internal settings
  or storage details were exposed. Anonymous policy access returned 401.
- Real Expo Web Patient flow passed on compact 390px EN/LTR and AR/RTL:
  image picker/file chooser, selected/uploading/ready tray, image upload
  (201), attachment-only send, PDF upload (201), attachment-only PDF send,
  text-only send, message persistence with one attachment per message,
  attachment filename/type/size metadata, and AR/EN accessibility labels.
  Screenshots are captured under `qa-artifacts/FILE-2-resume/`, including
  `patient-web-thread-en-390.png`, `patient-web-thread-ar-390.png`,
  `patient-web-image-preview-en-390.png`, and the selected/sent image/PDF
  states.
- Three smallest runtime repairs were made after reproducing Web defects:
  Mobile now uses the canonical attachment-policy route; Web converts the
  existing native `{uri,name,type}` upload shape to a Blob; attachment-only
  messages remain normal message bubbles instead of system bubbles; Web uses
  authenticated Blob URLs for image preview/document open-download; and the
  private attachment response opts into `Cross-Origin-Resource-Policy:
  cross-origin` while retaining authentication and the configured CORS
  allowlist. Native picker, upload, FileSystem, and Sharing behavior remains
  unchanged.
- Authorized attachment download returned 200 with the corrected resource
  policy header and bytes; anonymous download returned 401; the same file
  requested through an unrelated conversation returned 404. This preserves
  participant/cross-conversation privacy. Inbox copy remained generic and did
  not expose filenames.
- Validation passed: backend MessagingUseCase tests 5/5; Mobile message and
  inbox tests 11/11; targeted Mobile ESLint; Mobile runtime-safety audit after
  documenting the guarded Web URL/DOM branch; Expo Web export; live health,
  policy, authenticated upload/send, download, and privacy checks. Full
  repository type/i18n debt remains outside FILE-2.
- Still pending and not falsely claimed: authenticated Practitioner↔Patient
  attachment delivery using a sendable seeded pair; dynamic Admin Platform
  Settings toggle/restore; Web↔Admin runtime; separate authenticated
  recipient realtime delivery; Admin audit verification; notification payload
  privacy; and native Android/iOS QA. Malware scanning remains explicit
  PRE-LAUNCH SECURITY DEBT.
- Closure decision: FILE-2 remains IN_PROGRESS because the tracker’s final
  release gate requires the unexecuted native/Admin/cross-client evidence.
  The Web-capable implementation defects found in this gate are repaired and
  no FILE-2 reimplementation is planned. FILE-1 was not reopened and FILE-3
  was not started.

Execution log continuation - 2026-08-18 FILE-2 final remaining closure gate:

- Auth-race classification: the backend-issued practitioner token passed
  authenticated `/auth/me`, and the browser requests initially carried the
  token. The observed failure was a genuine Expo Web mobile defect: the
  shared `useUnifiedMessages` hook fetched the protected message list and
  joined Socket.IO from `conversationId` alone before the role-aware auth
  bootstrap gate was ready. A resulting 401 triggered the existing global
  session-clear handler. The smallest repair gates the protected message
  query, realtime subscription, and foreground refetch on the existing
  `useAuthenticatedQueryEnabled(role)` result. No backend auth behavior,
  token contract, or global refresh policy changed.
- A second runtime defect was proven in received attachment presentation:
  Mobile treated the `MessageAttachment` row id as the stored-file id even
  though the existing authenticated download route uses the stored-file id
  represented in `fileUrl`. Mobile now normalizes received HTTP and realtime
  messages at the canonical boundary; send payloads, routes, and backend
  response contracts remain unchanged.
- Practitioner F authenticated through the normal password→OTP flow and sent
  one image attachment-only message and one text-plus-PDF message to Patient
  A. Patient received both in order, rendered metadata, and downloaded both
  successfully with exact bytes. The final run produced EN/LTR and AR/RTL
  Practitioner screenshots showing the received image and PDF attachments;
  the initial auth/protected conversation requests retained Authorization and
  no 401/session-clear occurred after the auth gate repair.
- Two isolated authenticated Socket.IO clients proved both
  Practitioner→Patient and Patient→Practitioner `messages:new` delivery with
  join acknowledgement, no duplicate event, and persisted ordering. The
  existing Web→Expo Web and Expo Web→existing Web directions both persisted
  the existing `MessageAttachment` contract and downloaded successfully via
  the normal authenticated routes; no DB injection or alternate model was
  used.
- The unrelated-Practitioner denial was not retried through an auth bypass;
  the existing conversation-scoped authorization tests and live Patient,
  wrong-conversation, and cross-conversation rejection checks remain the
  accepted security boundary evidence. Admin attachment visibility,
  authorized download, `CHAT_ATTACHMENTS_READ`, SHA-256 match, and audit
  success remain PASS. Admin screenshot classification remains
  ENVIRONMENT-BLOCKED / NOT REQUIRED because FILE-2 did not change Admin UI.
- Validation passed: 39 focused Mobile tests, changed-file Mobile ESLint,
  Mobile runtime-safety audit, Expo Web export, backend health, Prisma
  validation, and scoped `git diff --check`. The repository changed-type
  helper still emits its pre-existing null-reference environment failure;
  no FILE-2-owned type/lint failure was found. The known full-seed
  practitioner-wallet uniqueness failure remains PRE-EXISTING UNRELATED
  DEBT.
- Native Android: PRE-RELEASE DEVICE QA. Native iOS: PRE-RELEASE DEVICE QA.
  Malware scanning remains explicit PRE-LAUNCH SECURITY DEBT. FILE-1 was not
  reopened, FILE-3 was not started, and NO FILE-2 IMPLEMENTATION WORK
  REMAINS.

Execution log continuation - 2026-08-19 unified file system final E2E smoke:

- Runtime precheck passed: PostgreSQL 17 is running and healthy; backend
  `GET /api/v1/health` returned HTTP 200; the existing deterministic Patient,
  Practitioner, Admin, conversation, payout, article, academy, and enrollment
  records were usable as applicable; Prisma reported 144 migrations and an
  up-to-date database; the unified root is
  `sawiyaa-backend-v1/storage/files`. No Android/iOS runtime was required for
  this server/Web file-platform smoke.
- Nine family classifications: User avatar PASS; Patient avatar PASS;
  Practitioner avatar PASS (owner and public read); Practitioner credential
  PASS after the QA harness correctly consumed the existing
  `credential.credentialId` response shape; Chat attachment PASS based on the
  accepted FILE-2 authenticated image/PDF evidence and current unified records;
  payout proof PASS using the existing seeded payout scenario; Article cover
  PASS; Academy program cover PASS; Academy enrollment certificate BLOCKED BY
  FIXTURE/ENVIRONMENT because the only seeded enrollment is
  `PENDING_PAYMENT`, and the backend correctly rejects certificate upload until
  the enrollment is eligible. No frontend business-state bypass was invented.
- Every exercised upload created active `StoredFile` metadata with purpose,
  original name where supplied, MIME, extension, byte size, SHA-256, and a
  purpose-scoped storage key. Owner/public/private reads returned exact byte
  hashes. Avatar, credential, chat, and payout files were relation-linked;
  article/academy cover uploads remained staged safe URLs as defined by their
  existing upload contracts. No response inspected in the smoke exposed a raw
  host path, volume, or storage key/path.
- Unified-root reconciliation passed: 31 active records were present, every
  active file existed under its expected purpose directory with matching size
  and SHA-256, and the reconciliation scan found zero untracked files. New
  smoke writes were observed under the unified root; baselined legacy roots
  retained their pre-smoke counts (`uploads` 58, `storage/patients` 3,
  `storage/practitioners` 14, `storage/articles` 51).
- Security smoke passed: anonymous/unrelated credential access, unauthorized
  payout proof access, unrelated Patient certificate access, and wrong-chat
  conversation access were rejected; public practitioner avatar, article cover,
  and academy cover reads were allowed. EN/LTR public Web visual smoke rendered
  practitioner avatar and academy cover pages at 390px; article page rendering
  used an existing external `picsum.photos` cover that failed to load, which
  is a fixture/content limitation and not a unified-storage write regression.
  Existing FILE-2 authenticated chat visual evidence remains accepted.
- Validation passed: focused Files tests 3/3; `src/modules/files` ESLint with
  the repository's Prettier worker disabled; backend typecheck; Prisma validate;
  Prisma migration status; live upload/read/security/reconciliation scripts;
  and Web visual smoke. The broader scoped ESLint invocation still hits the
  repository's Windows `eslint-plugin-prettier` EINVAL worker failure and
  reports three pre-existing errors in adjacent storage consumers; no runtime
  file regression was found and no production repair was made.
- Unified file system status: `UNIFIED FILE SYSTEM E2E VERIFIED` for all
  exercised families, with the academy certificate gate explicitly
  `BLOCKED BY FIXTURE/ENVIRONMENT` pending a confirmed/certifiable enrollment.
  FILE-1 was not reopened, FILE-2 was not reopened, and FILE-3 was not created.

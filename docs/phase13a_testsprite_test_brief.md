# Phase 13A - TestSprite Full-System QA Planning & Test Brief

## 1) Executive Summary
Fayed is ready for comprehensive QA planning across backend, web frontend, and mobile. The platform now includes:
- Hardened authentication and authorization.
- Step-up enforcement for sensitive admin mutations.
- Shared Redis-backed throttling support.
- Admin user management for internal platform users.
- Audit logging that now surfaces real `SecurityAuditLog` events in the admin audit timeline.
- Stable frontend and mobile lint/build gates.

This brief is written for TestSprite Web Portal or TestSprite MCP. It focuses on safe, sandboxed QA only. It does not require product code changes.

## 2) Startup Commands, URLs, and Constraints

### Backend
Project: `D:\Web\full-projects\fayed\fayed-backend-v1`

Commands:
```powershell
cd D:\Web\full-projects\fayed\fayed-backend-v1
npm install
npm run start:dev
```

Local URL:
- API base: `http://localhost:7000/api/v1`
- Swagger/OpenAPI: `http://localhost:7000/api/docs`

Notes:
- Backend `.env` currently uses `PORT=7000`.
- CORS includes `http://localhost:3000` and `http://localhost:7000`.
- Do not run `prisma migrate reset` or any destructive DB command.

### Web Frontend
Project: `D:\Web\full-projects\fayed\fayed-frontend-v1`

Commands:
```powershell
cd D:\Web\full-projects\fayed\fayed-frontend-v1
npm install
npm run dev
```

Local URLs:
- Arabic: `http://localhost:3000/ar`
- English: `http://localhost:3000/en`

Key routes to test:
- `/ar/signin/admin`
- `/ar/signin/patient`
- `/ar/signin/practitioner`
- `/ar/admin`
- `/ar/admin/users`
- `/ar/admin/users/[id]`
- `/ar/admin/users/[id]/permissions`
- `/ar/admin/audit?sortBy=occurredAt&sortDir=desc`
- `/ar/admin/finance`
- `/ar/admin/settlements`
- `/ar/admin/payments`
- `/ar/admin/support`
- `/ar/admin/care-chat`
- `/ar/admin/practitioner-applications`
- `/ar/admin/patients`
- `/ar/patient/...`
- `/ar/practitioner/...`

### Mobile
Project: `D:\Web\full-projects\fayed\fayed-mobile`

Commands:
```powershell
cd D:\Web\full-projects\fayed\fayed-mobile
npm install
npm start
```

Notes:
- Expo-based app.
- Direct TestSprite coverage depends on whether the toolchain can attach to Expo web, emulator, or device.
- If mobile automation is not available, use this document as the manual mobile QA checklist.

## 3) Test Accounts Matrix

Use placeholders in the TestSprite runner and map them to seeded or prepared test accounts.

| Persona | Placeholder Email | Placeholder Password | Primary Flows | Forbidden Areas |
|---|---|---|---|---|
| SUPER_ADMIN | `TEST_SUPER_ADMIN_EMAIL` | `TEST_SUPER_ADMIN_PASSWORD` | all admin flows, step-up, audit, admin users, finance, permissions | none expected |
| ADMIN | `TEST_ADMIN_EMAIL` | `TEST_ADMIN_PASSWORD` | allowed admin dashboards, admin users subset, audit read, finance read/write if granted | patient-only private data not assigned |
| SUPPORT_AGENT | `TEST_SUPPORT_EMAIL` | `TEST_SUPPORT_PASSWORD` | support inbox, care requests, chat triage | finance, settlements, admin users, permission editing |
| FINANCE_STAFF | `TEST_FINANCE_EMAIL` | `TEST_FINANCE_PASSWORD` | payments, refunds, settlements, payouts | admin users, support triage, private patient content |
| CONTENT_REVIEWER | `TEST_CONTENT_EMAIL` | `TEST_CONTENT_PASSWORD` | content moderation, articles, review queues | finance, settlements, admin users |
| PRACTITIONER_REVIEWER | `TEST_PRACTITIONER_REVIEWER_EMAIL` | `TEST_PRACTITIONER_REVIEWER_PASSWORD` | practitioner applications review | finance, support, admin users |
| PATIENT_OPERATIONS | `TEST_PATIENT_OPERATIONS_EMAIL` | `TEST_PATIENT_OPERATIONS_PASSWORD` | patient ops if enabled | finance, admin users, security settings |
| PATIENT | `TEST_PATIENT_EMAIL` | `TEST_PATIENT_PASSWORD` | own sessions, payments, support, assessments | admin pages, other patients/practitioners |
| PRACTITIONER | `TEST_PRACTITIONER_EMAIL` | `TEST_PRACTITIONER_PASSWORD` | own dashboard, sessions, wallet, support, profile | admin pages, other practitioners/patients |

### Seeded accounts already documented in the repo
The curated backend seed documents these QA accounts:
- `superAdmin`: `admin@hesba.local` / `Admin@12345`
- `support`: `support@hesba.local` / `Support@12345`
- `content reviewer`: `reviewer@hesba.local` / `Reviewer@12345`
- `patient A`: `ahmed.patient@hesba.local` / `Patient@12345`
- `patient B`: `mohamed.patient@hesba.local` / `Patient2@12345`
- `patient C`: `omar.patient@hesba.local` / `Patient3@12345`
- `practitioner A`: `dr.mohamed@hesba.local` / `Practitioner2@12345`
- `practitioner B`: `dr.ahmed@hesba.local` / `Practitioner@12345`

Notes:
- Finance / practitioner reviewer / patient operations / marketing staff may need to be created safely through admin user management if not already present in seed.
- Use only seeded or QA-prepared accounts. Do not use production identities.

## 4) Safe Test Data Plan

Use sandbox-only, synthetic data:
- Fake patient name, phone, and email for profile and support cases.
- Fake practitioner profile for application/review cases.
- Fake support ticket with a harmless title and short body.
- Fake care-chat thread containing non-sensitive content.
- Fake payment/refund identifiers in sandbox mode only, never real charges.
- Fake academy enrollment with a test course and test user.
- Fake admin-user-management target account created through the test seed or safe admin creation flow.

Do not:
- charge a real card
- send real SMS
- send real email
- use production IDs
- use real patient data

## 5) TestSprite-Ready Prompt

Paste this prompt into TestSprite:

```text
You are testing the Fayed platform in sandbox/local mode only.

Base URLs:
- Backend API: http://localhost:7000/api/v1
- Swagger: http://localhost:7000/api/docs
- Frontend Arabic: http://localhost:3000/ar
- Frontend English: http://localhost:3000/en

Primary locale: /ar
Secondary locale: /en

Use these placeholder accounts if already provisioned in the test DB:
- TEST_SUPER_ADMIN_EMAIL / TEST_SUPER_ADMIN_PASSWORD
- TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
- TEST_SUPPORT_EMAIL / TEST_SUPPORT_PASSWORD
- TEST_FINANCE_EMAIL / TEST_FINANCE_PASSWORD
- TEST_CONTENT_EMAIL / TEST_CONTENT_PASSWORD
- TEST_PRACTITIONER_REVIEWER_EMAIL / TEST_PRACTITIONER_REVIEWER_PASSWORD
- TEST_PATIENT_EMAIL / TEST_PATIENT_PASSWORD
- TEST_PRACTITIONER_EMAIL / TEST_PRACTITIONER_PASSWORD

Rules:
- Use sandbox/test data only.
- Do not use production secrets.
- Do not create real payment charges.
- Do not send real SMS or email.
- Do not run destructive DB actions.
- Prioritize critical security, authorization, audit, admin user management, finance, patient, and practitioner flows.
- Test Arabic routes first, then English if time remains.
- Capture screenshots for failures and report exact reproduction steps.
- Verify forbidden access returns safe 403 behavior and no redirect loops.
- Verify admin step-up prompts appear for sensitive actions.
- Verify audit logs show real recent admin actions.
```

## 6) Detailed Test Cases by Feature

### 6.1 Authentication
| ID | Priority | Persona | Preconditions | Steps | Expected Result | Negative / Security Checks |
|---|---|---|---|---|---|---|
| AUTH-001 | Critical | SUPER_ADMIN / ADMIN | Seeded admin account exists | Open `/ar/signin/admin`, sign in with valid credentials | Session created, redirected to admin dashboard | No token leak; safe error on failure |
| AUTH-002 | Critical | PATIENT | Seeded patient account exists | Sign in at `/ar/signin/patient` | Patient dashboard opens | Cannot reach admin routes |
| AUTH-003 | Critical | PRACTITIONER | Seeded practitioner account exists | Sign in at `/ar/signin/practitioner` | Practitioner dashboard opens | Cannot reach admin routes |
| AUTH-004 | High | Any persona | Invalid credentials | Try login with wrong password | Safe error shown | No account enumeration |
| AUTH-005 | High | Any persona | Active session exists | Logout from the app | Session cleared, redirect to sign-in | Old session cannot be reused |
| AUTH-006 | High | Any persona | Expired session or revoked token | Refresh or open protected page | User is forced to re-authenticate | No raw error stack in UI |

### 6.2 Admin Authorization and Navigation
| ID | Priority | Persona | Preconditions | Steps | Expected Result | Negative / Security Checks |
|---|---|---|---|---|---|---|
| ADMINAUTH-001 | Critical | SUPER_ADMIN | Logged in | Open admin dashboard | Sees all allowed admin areas | No hidden admin-only redirects |
| ADMINAUTH-002 | High | SUPPORT_AGENT | Logged in | Open finance/admin user management pages | Access denied safely | No data leakage |
| ADMINAUTH-003 | High | FINANCE_STAFF | Logged in | Open support/admin users pages | Access denied safely | No redirect loops |
| ADMINAUTH-004 | High | CONTENT_REVIEWER | Logged in | Open finance/settlements | Access denied safely | Forbidden view is safe |
| ADMINAUTH-005 | High | PRACTITIONER_REVIEWER | Logged in | Open admin users | Access denied safely | Backend remains source of truth |

### 6.3 Admin User Management
| ID | Priority | Persona | Preconditions | Steps | Expected Result | Negative / Security Checks |
|---|---|---|---|---|---|---|
| ADMUSR-001 | Critical | SUPER_ADMIN | Admin users exist | Open `/ar/admin/users` | Internal users list loads | No patient/practitioner public users in list |
| ADMUSR-002 | Critical | SUPER_ADMIN | Read/write access | Create a new internal admin user | User is created, audited | Password not displayed or logged |
| ADMUSR-003 | Critical | SUPER_ADMIN | Target user exists | Open details and edit profile | Profile updates persist | Safe audit event created |
| ADMUSR-004 | Critical | SUPER_ADMIN | Target user exists | Update user status | Status changes persist | Cannot self-disable |
| ADMUSR-005 | Critical | SUPER_ADMIN | Target user exists | Update roles | Roles persist, audit visible | Cannot remove last SUPER_ADMIN |
| ADMUSR-006 | Critical | SUPER_ADMIN | Target user exists | Open permissions page and save checkbox matrix | Overrides persist | Step-up required if backend asks |
| ADMUSR-007 | Critical | SUPER_ADMIN | Target user exists | Revoke sessions | Sessions are revoked | Cannot revoke self via admin route |
| ADMUSR-008 | Critical | SUPER_ADMIN | Target user exists | Invalidate token version | Token version increments | Cannot self-invalidate via admin route |
| ADMUSR-009 | High | ADMIN | Logged in | Try to assign SUPER_ADMIN role | Forbidden | Privilege escalation blocked |
| ADMUSR-010 | High | ADMIN | Logged in | Try to manage another admin’s custom permissions | Allowed only if granted specific permission | Backend validation still enforced |
| ADMUSR-011 | High | Any admin | Sensitive mutation | Trigger step-up required flow | Password re-auth dialog appears | Password not persisted |
| ADMUSR-012 | High | SUPER_ADMIN | Target role change | Attempt to demote the last SUPER_ADMIN | Blocked | Platform lockout prevented |

### 6.4 Audit Logs
| ID | Priority | Persona | Preconditions | Steps | Expected Result | Negative / Security Checks |
|---|---|---|---|---|---|---|
| AUDIT-001 | Critical | SUPER_ADMIN | Recent admin action performed | Open `/ar/admin/audit?sortBy=occurredAt&sortDir=desc` | Recent real event appears at top | No seed-only stale behavior |
| AUDIT-002 | High | SUPER_ADMIN | SecurityAuditLog row exists | Open event detail | Correct metadata displayed | No password/token/secret fields |
| AUDIT-003 | High | SUPER_ADMIN | Filters available | Sort/filter by category/severity/source | Results update correctly | Unknown event names still visible |
| AUDIT-004 | High | SUPER_ADMIN | Step-up action performed | Verify step-up required/success/failure events | Audit events visible | Sensitive metadata sanitized |

### 6.5 Finance / Payments / Refunds
| ID | Priority | Persona | Preconditions | Steps | Expected Result | Negative / Security Checks |
|---|---|---|---|---|---|---|
| FIN-001 | Critical | FINANCE_STAFF | Logged in | Open finance dashboard | Finance areas visible | Non-finance users blocked |
| FIN-002 | Critical | FINANCE_STAFF | Refund candidate exists | Approve/retry/cancel refund | Action succeeds only with permission and step-up | No real charge created |
| FIN-003 | Critical | FINANCE_STAFF | Settlement exists | Generate/mark paid/mark failed settlement | Action succeeds with permission and step-up | No unauthorized access |
| FIN-004 | High | SUPPORT_AGENT | Logged in | Open finance/settlements pages | Access denied | No data leak |

### 6.6 Support / Care Chat
| ID | Priority | Persona | Preconditions | Steps | Expected Result | Negative / Security Checks |
|---|---|---|---|---|---|---|
| SUP-001 | Critical | SUPPORT_AGENT | Logged in | Open support queues and tickets | Allowed pages visible | Finance/admin user management hidden |
| SUP-002 | High | SUPPORT_AGENT | Ticket exists | Open care-chat/support ticket and respond | Message delivered | Private data limited by role |
| SUP-003 | High | FINANCE_STAFF | Logged in | Open support console | Access denied | No support-only data exposure |

### 6.7 Practitioner Applications
| ID | Priority | Persona | Preconditions | Steps | Expected Result | Negative / Security Checks |
|---|---|---|---|---|---|---|
| PRACTAPP-001 | Critical | PRACTITIONER_REVIEWER | Application exists | Open applications list | List is visible | Non-reviewers blocked |
| PRACTAPP-002 | Critical | PRACTITIONER_REVIEWER | Application pending | Approve/reject/request changes | Action succeeds with audit | Step-up required if backend asks |
| PRACTAPP-003 | High | SUPPORT_AGENT | Logged in | Try reviewer actions | Forbidden | No escalation |

### 6.8 Patient Flows
| ID | Priority | Persona | Preconditions | Steps | Expected Result | Negative / Security Checks |
|---|---|---|---|---|---|---|
| PAT-001 | Critical | PATIENT | Logged in | Open own dashboard/sessions/payments/support | Own data visible | Other patient data blocked |
| PAT-002 | High | PATIENT | Another patient exists | Try to open another patient record | Access denied | IDOR blocked |
| PAT-003 | High | PATIENT | Admin route exists | Try to open `/ar/admin/...` | Forbidden | No admin data leak |

### 6.9 Practitioner Flows
| ID | Priority | Persona | Preconditions | Steps | Expected Result | Negative / Security Checks |
|---|---|---|---|---|---|---|
| PRAC-001 | Critical | PRACTITIONER | Logged in | Open own dashboard/sessions/wallet | Own data visible | Other practitioner data blocked |
| PRAC-002 | High | PRACTITIONER | Another practitioner exists | Try to open another practitioner record | Access denied | IDOR blocked |
| PRAC-003 | High | PRACTITIONER | Admin route exists | Try to open `/ar/admin/...` | Forbidden | No admin data leak |

### 6.10 Uploads
| ID | Priority | Persona | Preconditions | Steps | Expected Result | Negative / Security Checks |
|---|---|---|---|---|---|---|
| UPLOAD-001 | High | PATIENT | Upload UI available | Upload valid avatar | Upload succeeds | File type validated |
| UPLOAD-002 | High | PRACTITIONER | Upload UI available | Upload valid credential document | Upload succeeds | Access controlled |
| UPLOAD-003 | High | Any persona | Upload UI available | Upload oversized or empty file | Rejected safely | No server crash |

### 6.11 Rate Limits / Abuse
| ID | Priority | Persona | Preconditions | Steps | Expected Result | Negative / Security Checks |
|---|---|---|---|---|---|---|
| RATE-001 | Critical | Any persona | Login page | Repeated bad login attempts | Throttling triggers | Safe message only |
| RATE-002 | Critical | SUPER_ADMIN / ADMIN | Step-up dialog | Repeated wrong step-up password | Throttling triggers | No password leakage |
| RATE-003 | High | Anonymous | Public enrollment page | Rapid enrollment submissions | Throttling triggers | No sensitive info revealed |

### 6.12 Security Regression
| ID | Priority | Persona | Preconditions | Steps | Expected Result | Negative / Security Checks |
|---|---|---|---|---|---|---|
| SEC-001 | Critical | Any persona | Authenticated session | Test CSRF/cookie-protected actions | Secure behavior maintained | No unauthorized mutation |
| SEC-002 | Critical | Any persona | Forbidden page | Open denied route | Safe 403 page | No redirect loop |
| SEC-003 | High | SUPER_ADMIN | Sensitive action | Trigger a permission-denied or step-up-required response | Safe error shown | No stack trace shown |
| SEC-004 | High | Any persona | Cached sensitive area | Change roles/status then revisit | Sensitive cache refreshes | No stale privileged state |

## 7) Safety Rules
- Use sandbox/test data only.
- Do not create or use real patient data.
- Do not charge real payment methods.
- Do not send real SMS or email.
- Do not use production secrets.
- Do not run destructive DB commands.
- Do not reset the database.
- Do not edit migration history.
- Do not assume mobile automation is available unless TestSprite can attach to Expo/web/device.

## 8) Environment Readiness Checklist
- [ ] Backend running on `http://localhost:7000`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Database seeded with QA accounts
- [ ] Redis available if testing production throttle mode
- [ ] Payment providers in sandbox/test mode
- [ ] Email/SMS disabled or in test mode
- [ ] Upload storage in local/test mode
- [ ] TestSprite credentials configured
- [ ] No production secrets exposed
- [ ] Admin audit page shows recent real events
- [ ] Admin user management flows available

## 9) Known Limitations
- Some roles like `FINANCE_STAFF`, `PRACTITIONER_REVIEWER`, `PATIENT_OPERATIONS`, and `MARKETING_STAFF` may need to be provisioned if they are not already present in seed data.
- Mobile E2E depends on TestSprite support for Expo web, emulator, or device automation.
- Real payment, SMS, and email flows must remain sandbox-only.
- If a test environment is not seeded, TestSprite should stop and report the missing prerequisite rather than using production data.

## 10) Next Step
Ready to run TestSprite: **Yes, conditionally**

Missing prerequisites if any:
- Confirm QA accounts are seeded or provisioned for all target personas.
- Confirm backend and frontend are running on the expected local ports.
- Confirm sandbox integrations for payments and notifications.

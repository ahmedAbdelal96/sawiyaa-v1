# Patients Module API

## Purpose Of Module

Patients Module provides the baseline for the current patient's own profile.
It is responsible for:

- reading the current patient profile
- updating baseline patient profile fields
- uploading/replacing the current patient profile photo
- deleting the current patient profile photo
- serving the current patient profile photo binary
- ensuring a profile baseline exists
- completing a lightweight onboarding baseline
- returning localized success messages

It is intentionally not responsible for:

- auth flows
- users summary endpoints
- sessions, payments, chat, reviews, training
- medical records or intake forms
- practitioner-facing logic

## Endpoints

- `GET /patients/me`
- `PATCH /patients/me`
- `POST /patients/me/avatar` (multipart file upload)
- `DELETE /patients/me/avatar`
- `GET /patients/me/avatar`

## Guards Used

- `JwtAccessAuthGuard`
- `RolesGuard` with `PATIENT`
- `ActiveAccountGuard` via `@RequireAccountStates(ACTIVE_ACCOUNT)`

## Main DTOs

- `UpdatePatientProfileDto`
- `CompletePatientOnboardingDto`
- `PatientProfileResponseDto`
- `PatientProfileSuccessResponseDto`
- `PatientAvatarResponseDto`
- `PatientAvatarSuccessResponseDto`

## Main Use Cases

- `CreatePatientProfileUseCase`
- `GetPatientProfileUseCase`
- `UpdatePatientProfileUseCase`
- `CompletePatientOnboardingUseCase`
- `UpdatePatientAvatarUseCase`
- `RemovePatientAvatarUseCase`
- `GetPatientAvatarFileUseCase`

## Response Shape Notes

- the profile response includes only baseline patient profile and lightweight user preference data
- the response exposes:
  - `patientProfileId`
  - `userId`
  - `avatarUrl`
  - `avatarDataUrl` (base64 data URL for direct frontend rendering without extra image request)
  - `displayName`
  - `dateOfBirth`
  - `gender`
  - `locale`
  - `countryCode`
  - `timezone`
  - `isOnboardingCompleted`
  - `onboardingCompletedAt`
  - `createdAt`
  - `updatedAt`
- no raw Prisma shape, session data, payment data, or booking data is exposed

## Avatar Storage Notes

- avatar files are stored under: `storage/patients/`
- file name is deterministic by patient profile id (example: `<patientProfileId>.jpg`)
- allowed mime types: `image/jpeg`, `image/png`, `image/webp`
- max file size: `5MB`
- upload is replace-safe: previous avatar files for the same patient are deleted before writing the new file
- delete removes both profile avatar reference and underlying stored file
- avatar URL is resolved as `/api/v1/patients/me/avatar?v=<mtime>` for lightweight cache busting

## Localized Messages Notes

- success messages are resolved through `I18nService.t(...)`
- business errors use `messageKey` so the global exception filter can localize them
- Patients Module keeps its own catalog keys under `patients.*`

## Notes And Assumptions

- `GET /patients/me` is intentionally side-effect free; it does not auto-create a profile
- if a patient profile is missing, the module creates a lightweight baseline profile during the write path (`PATCH /patients/me`) before applying updates
- if avatar upload is requested and the profile is missing, the module bootstraps the same baseline profile first
- onboarding is considered completable only when `displayName`, `locale`, `timezone`, and `countryCode` are present
- onboarding is completed only when the caller explicitly sends `completeOnboarding=true`; normal updates alone do not auto-complete it
- `locale` and `timezone` are stored on `User`, while patient-specific fields stay on `PatientProfile`

## Out Of Scope

- auth flows and token/session management
- practitioner onboarding or applications
- support, chat, content, reviews, training
- sessions, payments, wallets
- advanced preferences or intake workflows

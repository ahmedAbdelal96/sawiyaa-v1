# Google Auth Setup

## Current Scope
- Google auth is enabled in the backend for the `patient` auth flow only.
- Frontend Google sign-in is shown only in patient mode on:
  - `/[locale]/signin`
  - `/[locale]/signup`

## Backend Contract
- Endpoint: `POST /api/v1/auth/patient/google`
- Request body:
  - `idToken: string`
  - `deviceId?: string`

## Required Environment Variables

### Frontend
Add to [`.env.local`](d:/Web/full-projects/fayed/fayed-frontend-v1/.env.local):

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
```

### Backend
Add to [`fayed-backend-v1/.env`](d:/Web/full-projects/fayed/fayed-backend-v1/.env):

```env
GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

## Google Cloud Console Checklist
Create or update a Web OAuth client and make sure these values are configured:

### Authorized JavaScript origins
- `http://localhost:3000`

### Authorized redirect URIs
- Google Identity Services button flow used here does not require a frontend redirect URI.
- Keep backend callback only if you plan to use it later for a separate server-side OAuth flow:
  - `http://localhost:7000/api/v1/auth/google/callback`

## Behavior Notes
- If `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is missing, the frontend shows a clear unavailable message instead of a broken button.
- If backend Google env values are missing, the frontend button renders but the request fails with backend configuration error.
- `callbackUrl` is preserved through:
  - protected route -> signin
  - signin -> signup
  - patient email/password auth
  - patient Google auth

## Local Verification Flow
1. Set the frontend and backend Google env values.
2. Restart frontend and backend servers.
3. Open `http://localhost:3000/ar/signup?role=patient`
4. Confirm the Google button appears.
5. Complete Google sign-in.
6. Confirm redirect goes to:
   - `callbackUrl` when present
   - `/ar/patient/dashboard` otherwise

## Out Of Scope
- Practitioner Google auth
- Admin Google auth
- Server-side OAuth redirect flow

# Architecture

Fayed is organized as a monorepo with separate apps and shared product rules.

## Top-level applications

- `fayed-backend-v1` - backend API and business logic.
- `fayed-frontend-v1` - web application used by public users, patients, practitioners, and admins.
- `fayed-mobile` - mobile client and mobile-specific flows.

## Backend shape

The backend follows a modular monolith model:

- each domain lives in its own module
- controllers expose the API surface
- DTOs define contracts
- services hold business logic
- repositories handle data access when needed
- shared concerns such as permissions, auditing, and formatting are centralized

Typical backend domains include:

- auth and user identity
- patient journeys
- practitioner journeys
- sessions and availability
- chat and moderation
- payments and wallet
- reports and support
- content and training
- notifications and settings

## Frontend shape

The web app is organized by audience and route group:

- public web
- patient web
- practitioner web
- admin web

The app relies on shared UI primitives, route guards, translations, and feature folders. The goal is to keep each screen close to the user task while still sharing the Fayed visual system.

## Shared concerns

- **Permissions**: access must be enforced in both backend and frontend.
- **Translations**: English and Arabic must stay in sync for user-facing text.
- **Money**: currency-aware formatting is mandatory.
- **Design system**: page structure should follow the Fayed Clinical Warmth rules.
- **Chat states**: available, read-only, unavailable, and error states must be explicit.
- **Cancellation and refunds**: must be data-driven and policy-based, not guessed.

## Data and contracts

The platform should treat the backend contract as the source of truth for:

- session eligibility
- money and currency values
- refund results
- chat availability
- role-based permissions
- moderation state

The frontend should present these values clearly, without inventing fallback logic that changes meaning.


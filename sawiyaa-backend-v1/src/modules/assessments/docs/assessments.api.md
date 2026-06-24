# Assessments API

## Purpose
Assessments provide a structured self-discovery and care-entry flow.
They are decision-support tools and are intentionally not diagnostic engines.

## Boundaries
- Separate from matching, booking, and session lifecycle.
- Can feed future matching refinement through stable structured result snapshots.
- Supports patient-owned assessment history.

## Endpoints
- `GET /api/v1/assessments`
- `GET /api/v1/assessments/:slug`
- `POST /api/v1/assessments/:slug/submissions` (patient auth)
- `GET /api/v1/patients/me/assessments` (patient auth)
- `GET /api/v1/patients/me/assessments/:submissionId` (patient auth)

## V1 Scope
- Single-choice answer model only.
- Completed submissions only (in-progress save deferred).
- Deterministic scoring.
- Non-diagnostic result band + supportive next-step output.

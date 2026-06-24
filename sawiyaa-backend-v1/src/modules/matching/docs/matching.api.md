# Guided Matching API

## Purpose

Guided Matching is a decision-support layer above public directory browsing.  
It helps patients answer "who is right for me" by storing intake preferences and returning deterministic, explainable recommendations.

## Boundaries

- This module does **not** replace `/public/practitioners` browsing APIs.
- This module does **not** create sessions/booking/payment flows.
- This module does **not** implement assessments yet (but the answer model is future-ready).

## Endpoints

- `POST /api/v1/matching/sessions`
- `GET /api/v1/matching/sessions/:id`

## Access

- Patient-authenticated only in V1.
- Guest/anonymous matching sessions are deferred intentionally to avoid weak ownership semantics in this phase.

## Persistence

- `MatchingSession`: lifecycle and ownership
- `MatchingAnswer`: normalized key/value answers
- `MatchingRecommendation`: scored/ranked recommendation snapshots with rationale JSON

## Scoring Baseline (Deterministic)

Weighted scoring totals 100 points and remains fully rule-based (no black-box ML):

- Specialty relevance: 24
- Language match: 16
- Budget fit / near-budget tolerance: 18
- Urgency fit: 10
- Provider type preference: 8
- Instant booking preference: 5
- First-time therapy preference: 5
- Session mode compatibility: 4
- Experience depth signal: 6
- Availability readiness signal: 4

When a patient leaves some preferences open, the engine applies small neutral baseline points
instead of full-match points. This reduces tie-heavy results and improves ranking quality.

## Rationale

Each recommendation returns:

- boolean match signals
- score breakdown object (earned points per signal)
- human-readable notes

This keeps the baseline explainable and avoids black-box behavior.

## Future Hooks

- Assessment result keys can be persisted in `MatchingAnswer` without schema redesign.
- Conversion analytics can correlate `MatchingSession` and downstream booking later.

# Production Rollout

This document captures the rollout rules that protect production changes.

## Baseline rule

- Backend is the source of truth.
- Contract changes should be deployed in a safe order.
- Do not hide rollout problems with frontend-only fallback logic.

## Safe rollout sequence

1. Backup the database when the change affects schema or critical data paths.
2. Apply the required migration before deploying backend code that expects the new columns or tables.
3. Deploy the backend.
4. Deploy the frontend and mobile clients that consume the new contract.
5. Verify the admin surface first for correctness and missing data.
6. Fill or correct production data when the new fields require real values.
7. Verify public Arabic and English pages.
8. Verify patient, practitioner, and admin smoke paths.

## When migration order matters

- Local development can be reset or seeded for testing, but production must not rely on that.
- If the backend expects a column that does not exist yet, the fix is to apply the migration, not to add raw SQL fallback.
- If a migration is destructive or table-altering, backup/export the relevant data first.

## Release checkpoints

- No secrets committed.
- No `.env` files committed.
- No generated upload or build folders committed.
- Matching backend and frontend contracts.
- Admin edit forms still show raw fields.
- Public pages still show locale-aware display names.

## Related docs

- [Availability system](availability-system.md)
- [Specialties localization](specialties-localization.md)
- [Finance and payouts](finance-and-payouts.md)
- [Removed and deprecated flows](removed-and-deprecated-flows.md)

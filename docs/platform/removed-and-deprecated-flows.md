# Removed and Deprecated Flows

This document records flows that should no longer be treated as active product paths.

## Removed from active use

- `/admin/settlements` is not part of the active admin workflow.
- The legacy recurring availability runtime flow is removed.
- Raw SQL fallback for localized specialty names is not the intended implementation.
- Legacy Training public, patient, and admin routes are redirect-only compatibility surfaces and are not active product areas.

## Do not reintroduce

- Grouped practitioner settlement workflows.
- Compatibility hacks that fake missing localized columns.
- Frontend-only financial totals.
- Any flow that bypasses backend source-of-truth rules.
- New user-facing Training surfaces or nav entries.

## Historical references

- Historical audit documents may still mention old routes or retired flows.
- Those references are historical evidence, not a signal to resurrect the feature.

## Related docs

- [Finance and payouts](finance-and-payouts.md)
- [Availability system](availability-system.md)
- [Platform overview](platform-overview.md)

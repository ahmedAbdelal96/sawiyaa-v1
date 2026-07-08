# Accounting Reconciliation

This document defines the current accounting reconciliation surface.

## Purpose

- The reconciliation route is diagnostic and review-oriented.
- It exists to help operators compare records and investigate accounting state.

## Current route

- `/admin/finance/accounting/reconciliation`

## Mutability rule

- Scan and review actions may update diagnostic or review records only.
- The page must not mutate balances, payouts, refunds, or ledger state.
- The surface is for inspection and reconciliation, not money movement.

## UI rules

- Keep copy compact and operational.
- Do not show technical IDs in normal table rows unless necessary.
- Details can expose more context when the user drills in.

## Related docs

- [Finance and payouts](finance-and-payouts.md)
- [Operations and support](operations-and-support.md)

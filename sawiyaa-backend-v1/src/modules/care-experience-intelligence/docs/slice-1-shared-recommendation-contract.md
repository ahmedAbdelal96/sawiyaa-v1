# Care Experience Intelligence Depth — Slice 1

## Scope

This slice introduces a shared recommendation contract and centralized precedence rules for matching and patient-journey surfaces.

## Contract baseline

Each recommendation item now includes:

- `type`
- `priority`
- `reasonCode`
- `reasonText`
- `action`
- `entityRefs`
- `expiresAt`
- `label` (kept for backward-safe UI text compatibility)

## Precedence behavior

Ordering is centralized and deterministic:

1. Higher `priority` first.
2. Tie-break by `type`.
3. Then `reasonCode`.
4. Then action target identity.
5. Then normalized entity references.

This avoids unstable ordering when inputs are identical.

# Admin Platform Settings

The Admin Platform Settings API is backed by the canonical Config definitions. It does not maintain a second settings registry.

## Routes

- `GET /api/v1/admin/platform-settings`
- `PATCH /api/v1/admin/platform-settings/:key`
- `PATCH /api/v1/admin/platform-settings/:key/reset`
- `GET /api/v1/admin/platform-settings/:key/history`

The list response contains safe metadata and effective values only. ENV-owned, legacy, sensitive, and infrastructure values are excluded.

## Permissions

- `configuration.view`: list and read safe settings
- `configuration.edit.operational`: edit/reset operational settings
- `configuration.edit.financial`: reserved for financial domain authorization
- `configuration.history.view`: view change history

Payment settings remain read-only on the generic page and link to Payment Gateway Control. This prevents a weaker generic route from bypassing payment-specific protections.

## Concurrency and history

Updates and resets require a reason and the current `expectedUpdatedAt` revision. Stale writes return a conflict. Reset deactivates the active override, allowing the catalog default to become effective, without deleting historical rows. `ConfigChangeLog` records the operation.

Config cache, Redis, WebSocket updates, and live invalidation are intentionally deferred to the future system-wide cache architecture.

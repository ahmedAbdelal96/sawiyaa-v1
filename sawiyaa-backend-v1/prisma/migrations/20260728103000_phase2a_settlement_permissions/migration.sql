-- Ensure Phase 2A permissions exist even when deployments do not run the full seed.
INSERT INTO "Permission" ("id", "key", "description", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'financial.settlement.view', 'View accountant settlement queue and details', now(), now()),
  (gen_random_uuid(), 'financial.settlement.review', 'Review and reject accountant settlements', now(), now()),
  (gen_random_uuid(), 'financial.settlement.approve', 'Approve accountant settlements and credit wallets', now(), now()),
  (gen_random_uuid(), 'financial.settlement.adjust', 'Add append-only settlement adjustments before approval', now(), now()),
  (gen_random_uuid(), 'financial.payout.execute', 'Execute external payout preparation for credited settlements', now(), now())
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("id", "role", "permissionId", "createdAt")
SELECT gen_random_uuid(), roles.role, permissions.id, now()
FROM (VALUES ('SUPER_ADMIN'::"UserRoleType"), ('ADMIN'::"UserRoleType"), ('FINANCE_STAFF'::"UserRoleType")) AS roles(role)
CROSS JOIN "Permission" permissions
WHERE permissions."key" IN (
  'financial.settlement.view',
  'financial.settlement.review',
  'financial.settlement.approve',
  'financial.settlement.adjust',
  'financial.payout.execute'
)
ON CONFLICT ("role", "permissionId") DO NOTHING;

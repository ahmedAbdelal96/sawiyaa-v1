-- Extend admin role taxonomy.
ALTER TYPE "UserRoleType" ADD VALUE IF NOT EXISTS 'FINANCE_STAFF';
ALTER TYPE "UserRoleType" ADD VALUE IF NOT EXISTS 'MARKETING_STAFF';
ALTER TYPE "UserRoleType" ADD VALUE IF NOT EXISTS 'PRACTITIONER_REVIEWER';
ALTER TYPE "UserRoleType" ADD VALUE IF NOT EXISTS 'PATIENT_OPERATIONS';

-- Create per-user override effect enum used by the permission resolver.
DO $$
BEGIN
  CREATE TYPE "PermissionOverrideEffect" AS ENUM ('ALLOW', 'DENY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Permission" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RolePermission" (
    "id" UUID NOT NULL,
    "role" "UserRoleType" NOT NULL,
    "permissionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserPermissionOverride" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "effect" "PermissionOverrideEffect" NOT NULL,
    "reason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_role_permissionId_key" ON "RolePermission"("role", "permissionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RolePermission_role_idx" ON "RolePermission"("role");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserPermissionOverride_userId_permissionId_key" ON "UserPermissionOverride"("userId", "permissionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserPermissionOverride_userId_idx" ON "UserPermissionOverride"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserPermissionOverride_permissionId_idx" ON "UserPermissionOverride"("permissionId");

-- AddForeignKey
ALTER TABLE "RolePermission"
  ADD CONSTRAINT "RolePermission_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionOverride"
  ADD CONSTRAINT "UserPermissionOverride_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionOverride"
  ADD CONSTRAINT "UserPermissionOverride_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

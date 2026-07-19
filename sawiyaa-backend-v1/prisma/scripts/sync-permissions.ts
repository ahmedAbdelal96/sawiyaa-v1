import 'dotenv/config';
import {
  Prisma,
  PrismaClient,
  AuthProvider,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import {
  permissionDefinitions,
  rolePermissionBundles,
} from '../seed/modules/auth.permissions';
import { hashPassword } from '../seed/shared/seed.utils';

const TARGET_ADMIN_EMAIL = 'admin@sawiyaa.com';
const APPLY_FLAG = '--apply';
const DRY_RUN_FLAG = '--dry-run';
const JSON_FLAG = '--json';

type DbClient = PrismaClient | Prisma.TransactionClient;

type SyncSummary = {
  mode: 'dry-run' | 'apply';
  canonicalPermissionCount: number;
  permissionCountBefore: number;
  permissionCountAfter: number;
  missingPermissionKeysBefore: string[];
  missingPermissionKeysAfter: string[];
  stalePermissionKeys: string[];
  permissionsInserted: number;
  permissionsUpdated: number;
  permissionsUnchanged: number;
  rolePermissionsInserted: number;
  rolePermissionsUnchanged: number;
  superAdminRolesRemoved: number;
  targetSuperAdminRoleAdded: number;
  targetStatusUpdated: number;
  targetAdminCreated: number;
  targetAdminEmail: string;
  targetAdminUserId: string;
  targetAdminStatus: UserStatus;
  activeSuperAdminCount: number;
};

function parseArgs(argv: string[]) {
  const supported = new Set([APPLY_FLAG, DRY_RUN_FLAG, JSON_FLAG]);
  const unknown = argv.filter((arg) => !supported.has(arg));
  if (unknown.length > 0) {
    throw new Error(`Unsupported arguments: ${unknown.join(', ')}`);
  }

  const dryRun = argv.includes(DRY_RUN_FLAG);
  const apply = argv.includes(APPLY_FLAG);
  if (dryRun && apply) {
    throw new Error('Use either --dry-run or --apply, not both.');
  }

  return {
    dryRun: !apply,
    json: argv.includes(JSON_FLAG),
  };
}

async function findTargetAdmin(db: DbClient) {
  const normalizedTarget = TARGET_ADMIN_EMAIL.toLowerCase();
  const emailRows = await db.userEmail.findMany({
    select: {
      email: true,
      user: {
        select: {
          id: true,
          status: true,
          roles: {
            select: { role: true },
          },
        },
      },
    },
  });

  const matches = emailRows.filter(
    (row) => row.email.trim().toLowerCase() === normalizedTarget,
  );

  if (matches.length > 1) {
    throw new Error(
      `Expected exactly one user for ${TARGET_ADMIN_EMAIL}; found ${matches.length}.`,
    );
  }

  return matches[0]?.user ?? null;
}

async function createTargetAdmin(db: DbClient) {
  const password = process.env.PERMISSION_SYNC_ADMIN_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      `User ${TARGET_ADMIN_EMAIL} does not exist. Set PERMISSION_SYNC_ADMIN_PASSWORD for account creation.`,
    );
  }

  const user = await db.user.create({
    data: {
      displayName: 'Sawiyaa Production Admin',
      status: UserStatus.ACTIVE,
      defaultLocale: 'ar',
      timezone: 'Africa/Cairo',
    },
    select: { id: true, status: true },
  });

  await db.userEmail.create({
    data: {
      userId: user.id,
      email: TARGET_ADMIN_EMAIL,
      isPrimary: true,
      isVerified: true,
    },
  });

  await db.authIdentity.create({
    data: {
      userId: user.id,
      provider: AuthProvider.PASSWORD,
      passwordHash: await hashPassword(password),
      isEnabled: true,
    },
  });

  return {
    ...user,
    roles: [],
  };
}

async function syncPermissions(
  db: DbClient,
  dryRun: boolean,
): Promise<SyncSummary> {
  const canonicalKeys = permissionDefinitions.map((permission) => permission.key);
  const canonicalKeySet = new Set(canonicalKeys);
  const existingPermissions = await db.permission.findMany({
    select: { id: true, key: true, description: true },
  });
  const existingByKey = new Map(
    existingPermissions.map((permission) => [permission.key, permission]),
  );
  const missingPermissionKeysBefore = canonicalKeys.filter(
    (key) => !existingByKey.has(key),
  );
  const stalePermissionKeys = existingPermissions
    .map((permission) => permission.key)
    .filter((key) => !canonicalKeySet.has(key))
    .sort();

  const permissionsInserted = missingPermissionKeysBefore.length;
  const permissionsUpdated = permissionDefinitions.filter((permission) => {
    const existing = existingByKey.get(permission.key);
    return Boolean(existing && existing.description !== permission.description);
  }).length;
  const permissionsUnchanged = permissionDefinitions.length - permissionsInserted - permissionsUpdated;

  let targetAdminBefore = await findTargetAdmin(db);
  let targetAdminCreated = 0;
  if (!targetAdminBefore && !dryRun) {
    targetAdminBefore = await createTargetAdmin(db);
    targetAdminCreated = 1;
  }
  const activeSuperAdminRows = await db.userRole.findMany({
    where: { role: UserRoleType.SUPER_ADMIN },
    select: { userId: true, user: { select: { status: true } } },
  });
  const superAdminRolesRemoved = activeSuperAdminRows.filter(
    (row) => row.userId !== targetAdminBefore?.id,
  ).length;
  const targetHasSuperAdminRole = targetAdminBefore?.roles.some(
    (role) => role.role === UserRoleType.SUPER_ADMIN,
  ) ?? false;

  let permissionIdsByKey = new Map(
    existingPermissions.map((permission) => [permission.key, permission.id]),
  );

  if (!dryRun) {
    for (const permission of permissionDefinitions) {
      const saved = await db.permission.upsert({
        where: { key: permission.key },
        create: permission,
        update: { description: permission.description },
        select: { id: true, key: true },
      });
      permissionIdsByKey.set(saved.key, saved.id);
    }

    await db.userRole.deleteMany({
      where: {
        role: UserRoleType.SUPER_ADMIN,
        userId: { not: targetAdminBefore!.id },
      },
    });

    await db.userRole.upsert({
      where: {
        userId_role: {
          userId: targetAdminBefore!.id,
          role: UserRoleType.SUPER_ADMIN,
        },
      },
      create: {
        userId: targetAdminBefore!.id,
        role: UserRoleType.SUPER_ADMIN,
      },
      update: {},
    });

    if (targetAdminBefore!.status !== UserStatus.ACTIVE) {
      await db.user.update({
        where: { id: targetAdminBefore!.id },
        data: { status: UserStatus.ACTIVE },
      });
    }
  }

  const permissionIds = [...permissionIdsByKey.values()];
  const existingRolePermissions = await db.rolePermission.findMany({
    where: { permissionId: { in: permissionIds } },
    select: { role: true, permissionId: true },
  });
  const existingRolePermissionKeys = new Set(
    existingRolePermissions.map((row) => `${row.role}:${row.permissionId}`),
  );
  let rolePermissionsInserted = 0;
  let rolePermissionsUnchanged = 0;

  if (!dryRun) {
    for (const bundle of rolePermissionBundles) {
      for (const permissionKey of bundle.permissions) {
        const permissionId = permissionIdsByKey.get(permissionKey);
        if (!permissionId) {
          throw new Error(`Canonical permission was not persisted: ${permissionKey}`);
        }
        const key = `${bundle.role}:${permissionId}`;
        if (existingRolePermissionKeys.has(key)) {
          rolePermissionsUnchanged += 1;
          continue;
        }
        await db.rolePermission.create({
          data: { role: bundle.role, permissionId },
        });
        rolePermissionsInserted += 1;
      }
    }
  } else {
    for (const bundle of rolePermissionBundles) {
      for (const permissionKey of bundle.permissions) {
        const permissionId = permissionIdsByKey.get(permissionKey);
        const key = `${bundle.role}:${permissionId}`;
        if (permissionId && existingRolePermissionKeys.has(key)) {
          rolePermissionsUnchanged += 1;
        } else {
          rolePermissionsInserted += 1;
        }
      }
    }
  }

  const permissionsAfter = dryRun
    ? existingPermissions
    : await db.permission.findMany({ select: { key: true } });
  const missingPermissionKeysAfter = canonicalKeys.filter(
    (key) => !permissionsAfter.some((permission) => permission.key === key),
  );
  const targetAdminAfter = dryRun ? targetAdminBefore : await findTargetAdmin(db);
  const activeSuperAdminCount = dryRun
    ? activeSuperAdminRows.filter((row) => row.user.status === UserStatus.ACTIVE).length +
      (targetAdminBefore ? 0 : 1)
    : await db.userRole.count({
        where: {
          role: UserRoleType.SUPER_ADMIN,
          user: { status: UserStatus.ACTIVE },
        },
      });

  return {
    mode: dryRun ? 'dry-run' : 'apply',
    canonicalPermissionCount: permissionDefinitions.length,
    permissionCountBefore: existingPermissions.length,
    permissionCountAfter: dryRun ? existingPermissions.length + permissionsInserted : permissionsAfter.length,
    missingPermissionKeysBefore,
    missingPermissionKeysAfter,
    stalePermissionKeys,
    permissionsInserted,
    permissionsUpdated,
    permissionsUnchanged,
    rolePermissionsInserted,
    rolePermissionsUnchanged,
    superAdminRolesRemoved,
    targetSuperAdminRoleAdded: targetHasSuperAdminRole ? 0 : 1,
    targetStatusUpdated:
      targetAdminBefore?.status === UserStatus.ACTIVE || targetAdminCreated === 1 ? 0 : 1,
    targetAdminCreated,
    targetAdminEmail: TARGET_ADMIN_EMAIL,
    targetAdminUserId: targetAdminAfter?.id ?? 'not-created-dry-run',
    targetAdminStatus: targetAdminAfter?.status ?? UserStatus.ACTIVE,
    activeSuperAdminCount,
  };
}

async function main() {
  const { dryRun, json } = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    const summary = dryRun
      ? await syncPermissions(prisma, true)
      : await prisma.$transaction((tx) => syncPermissions(tx, false));
    if (json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(`[permission-sync] mode=${summary.mode}`);
      console.log(JSON.stringify(summary, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[permission-sync] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

import 'dotenv/config';
import { AuthProvider, Prisma, PrismaClient, UserRoleType, UserStatus } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { hashPassword } from '../seed/shared/seed.utils';

export type InitialAdminInput = {
  email: string;
  name: string;
  password: string;
};

export type InitialAdminResult = {
  status: 'created' | 'configured' | 'already_configured';
  userId: string;
};

export type InitialAdminDatabase = {
  userEmail: {
    findMany: (args: unknown) => Promise<Array<any>>;
    create: (args: unknown) => Promise<any>;
  };
  user: {
    create: (args: unknown) => Promise<any>;
  };
  authIdentity: {
    create: (args: unknown) => Promise<any>;
  };
  userRole: {
    upsert: (args: unknown) => Promise<any>;
  };
  $transaction: (
    callback: (tx: InitialAdminDatabase) => Promise<InitialAdminResult>,
    options?: unknown,
  ) => Promise<InitialAdminResult>;
};

const REQUIRED_PASSWORD_LENGTH = 16;
const MAX_UNIQUE_RETRIES = 3;
const INCOMPATIBLE_ROLES = new Set<UserRoleType>([
  UserRoleType.PATIENT,
  UserRoleType.TRAINEE,
  UserRoleType.PRACTITIONER,
]);

export function readInitialAdminInput(env: NodeJS.ProcessEnv = process.env): InitialAdminInput {
  const email = requireInput(env.PRODUCTION_INITIAL_ADMIN_EMAIL, 'PRODUCTION_INITIAL_ADMIN_EMAIL')
    .trim()
    .toLowerCase();
  const name = requireInput(env.PRODUCTION_INITIAL_ADMIN_NAME, 'PRODUCTION_INITIAL_ADMIN_NAME').trim();
  const password = requireInput(
    env.PRODUCTION_INITIAL_ADMIN_PASSWORD,
    'PRODUCTION_INITIAL_ADMIN_PASSWORD',
  );

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('PRODUCTION_INITIAL_ADMIN_EMAIL must be a valid email address.');
  }
  if (name.length < 2) throw new Error('PRODUCTION_INITIAL_ADMIN_NAME is too short.');
  if (password.length < REQUIRED_PASSWORD_LENGTH) {
    throw new Error(
      `PRODUCTION_INITIAL_ADMIN_PASSWORD must contain at least ${REQUIRED_PASSWORD_LENGTH} characters.`,
    );
  }

  return { email, name, password };
}

export async function bootstrapInitialAdmin(
  database: InitialAdminDatabase,
  input: InitialAdminInput,
): Promise<InitialAdminResult> {
  const normalizedInput = normalizeInput(input);
  const passwordHash = await hashPassword(normalizedInput.password);

  for (let attempt = 0; attempt < MAX_UNIQUE_RETRIES; attempt += 1) {
    try {
      return await database.$transaction(
        (tx) => ensureInitialAdmin(tx, normalizedInput, passwordHash),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === MAX_UNIQUE_RETRIES - 1) throw error;
      await delay(25 * (attempt + 1));
    }
  }

  throw new Error('Initial admin bootstrap did not complete.');
}

function normalizeInput(input: InitialAdminInput): InitialAdminInput {
  const email = input.email.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Initial administrator email is invalid.');
  }
  if (!input.name.trim()) throw new Error('Initial administrator name is required.');
  if (input.password.length < REQUIRED_PASSWORD_LENGTH) {
    throw new Error(
      `Initial administrator password must contain at least ${REQUIRED_PASSWORD_LENGTH} characters.`,
    );
  }
  return { email, name: input.name.trim(), password: input.password };
}

async function ensureInitialAdmin(
  db: InitialAdminDatabase,
  input: InitialAdminInput,
  passwordHash: string,
): Promise<InitialAdminResult> {
  const matches = await db.userEmail.findMany({
    where: { email: { equals: input.email, mode: 'insensitive' } },
    select: {
      id: true,
      userId: true,
      email: true,
      user: {
        select: {
          id: true,
          displayName: true,
          status: true,
          roles: { select: { role: true } },
          authIdentities: {
            where: { provider: AuthProvider.PASSWORD },
            select: { id: true, provider: true, passwordHash: true, isEnabled: true },
          },
          patientProfile: { select: { id: true } },
          practitionerProfile: { select: { id: true } },
        },
      },
    },
  });

  if (matches.length > 1) {
    throw new Error('Initial administrator bootstrap found duplicate normalized identities.');
  }

  if (matches.length === 0) {
    const user = await db.user.create({
      data: {
        displayName: input.name,
        status: UserStatus.ACTIVE,
        defaultLocale: 'ar',
        timezone: 'Africa/Cairo',
      },
      select: { id: true, status: true },
    });
    await db.userEmail.create({
      data: {
        userId: user.id,
        email: input.email,
        isPrimary: true,
        isVerified: true,
      },
      select: { id: true },
    });
    await db.authIdentity.create({
      data: {
        userId: user.id,
        provider: AuthProvider.PASSWORD,
        passwordHash,
        isEnabled: true,
      },
      select: { id: true },
    });
    await db.userRole.upsert({
      where: { userId_role: { userId: user.id, role: UserRoleType.SUPER_ADMIN } },
      create: { userId: user.id, role: UserRoleType.SUPER_ADMIN },
      update: {},
    });
    return { status: 'created', userId: user.id };
  }

  const match = matches[0];
  const user = match.user;
  if (!user || user.id !== match.userId) {
    throw new Error('Initial administrator bootstrap found an inconsistent identity relation.');
  }
  const roles = (user.roles ?? []).map((role: { role: UserRoleType }) => role.role);
  if (
    user.patientProfile ||
    user.practitionerProfile ||
    roles.some((role: UserRoleType) => INCOMPATIBLE_ROLES.has(role)) ||
    user.status !== UserStatus.ACTIVE
  ) {
    throw new Error('Initial administrator bootstrap found an incompatible identity state.');
  }

  const passwordIdentities = user.authIdentities ?? [];
  if (passwordIdentities.length > 1) {
    throw new Error('Initial administrator bootstrap found ambiguous password identities.');
  }
  if (
    passwordIdentities[0] &&
    (!passwordIdentities[0].isEnabled || !passwordIdentities[0].passwordHash)
  ) {
    throw new Error('Initial administrator bootstrap found an unusable password identity.');
  }
  if (!passwordIdentities[0]) {
    await db.authIdentity.create({
      data: {
        userId: user.id,
        provider: AuthProvider.PASSWORD,
        passwordHash,
        isEnabled: true,
      },
      select: { id: true },
    });
  }

  const hasSuperAdmin = roles.includes(UserRoleType.SUPER_ADMIN);
  if (!hasSuperAdmin) {
    await db.userRole.upsert({
      where: { userId_role: { userId: user.id, role: UserRoleType.SUPER_ADMIN } },
      create: { userId: user.id, role: UserRoleType.SUPER_ADMIN },
      update: {},
    });
  }

  return {
    status: hasSuperAdmin && passwordIdentities[0] ? 'already_configured' : 'configured',
    userId: user.id,
  };
}

function requireInput(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`${name} is required for initial administrator bootstrap.`);
  return value;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const initialAdminInput = await resolveInitialAdminInput(prisma);
    if (!initialAdminInput) {
      console.log('INITIAL_ADMIN_BOOTSTRAP_ALREADY_CONFIGURED');
      return;
    }
    writeResolvedInitialAdminEmail(initialAdminInput.email);
    const result = await bootstrapInitialAdmin(
      prisma as unknown as InitialAdminDatabase,
      initialAdminInput,
    );
    console.log(`INITIAL_ADMIN_BOOTSTRAP_${result.status.toUpperCase()}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function resolveInitialAdminInput(prisma: PrismaClient): Promise<InitialAdminInput | null> {
  const configured = [
    process.env.PRODUCTION_INITIAL_ADMIN_EMAIL,
    process.env.PRODUCTION_INITIAL_ADMIN_NAME,
    process.env.PRODUCTION_INITIAL_ADMIN_PASSWORD,
  ];
  if (configured.some(Boolean)) {
    if (configured.some((value) => !value)) {
      throw new Error(
        'Initial administrator bootstrap requires PRODUCTION_INITIAL_ADMIN_EMAIL, PRODUCTION_INITIAL_ADMIN_NAME, and PRODUCTION_INITIAL_ADMIN_PASSWORD together.',
      );
    }
    const input = readInitialAdminInput();
    writeResolvedInitialAdminEmail(input.email);
    return input;
  }

  if (!input.isTTY || !output.isTTY) {
    throw new Error(
      'Initial administrator bootstrap requires the three PRODUCTION_INITIAL_ADMIN_* variables in non-interactive mode.',
    );
  }

  const email = (await ask('Initial admin email: ')).trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Initial administrator email must be a valid email address.');
  }

  const existing = await prisma.userEmail.findMany({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          status: true,
          roles: { select: { role: true } },
          patientProfile: { select: { id: true } },
          practitionerProfile: { select: { id: true } },
          authIdentities: {
            where: { provider: AuthProvider.PASSWORD },
            select: { passwordHash: true, isEnabled: true },
          },
        },
      },
    },
  });
  if (existing.length === 1) {
    const user = existing[0].user;
    const hasUsablePassword = user.authIdentities.length === 1 &&
      user.authIdentities[0].isEnabled &&
      Boolean(user.authIdentities[0].passwordHash);
    const isUsableAdmin = user.status === UserStatus.ACTIVE &&
      !user.patientProfile &&
      !user.practitionerProfile &&
      user.roles.some((role) => role.role === UserRoleType.SUPER_ADMIN) &&
      hasUsablePassword;
    if (isUsableAdmin) {
      writeResolvedInitialAdminEmail(email);
      return null;
    }
  }

  const name = (await ask('Initial admin display name: ')).trim();
  const password = await askHidden('Initial admin password (hidden): ');
  const resolved = readInitialAdminInput({
    PRODUCTION_INITIAL_ADMIN_EMAIL: email,
    PRODUCTION_INITIAL_ADMIN_NAME: name,
    PRODUCTION_INITIAL_ADMIN_PASSWORD: password,
  });
  writeResolvedInitialAdminEmail(resolved.email);
  return resolved;
}

function writeResolvedInitialAdminEmail(email: string): void {
  const stateFile = process.env.PRODUCTION_INITIAL_ADMIN_STATE_FILE;
  if (!stateFile) return;
  mkdirSync(dirname(stateFile), { recursive: true, mode: 0o700 });
  writeFileSync(stateFile, `${email.trim().toLowerCase()}\n`, { mode: 0o600 });
}

async function ask(question: string): Promise<string> {
  const readline = createInterface({ input, output });
  try {
    return await readline.question(question);
  } finally {
    readline.close();
  }
}

async function askHidden(question: string): Promise<string> {
  const terminal = input as NodeJS.ReadStream & { setRawMode?: (mode: boolean) => void };
  if (!terminal.isTTY || !terminal.setRawMode) {
    throw new Error('INITIAL_ADMIN_PASSWORD_INPUT_REQUIRED_NO_TTY');
  }
  output.write(question);
  terminal.setRawMode(true);
  return new Promise((resolve, reject) => {
    let value = '';
    let settled = false;
    const onData = (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      for (const character of text) {
        if (character === '\u0003') {
          finish(new Error('Initial administrator password input cancelled.'));
        } else if (character === '\r' || character === '\n') {
          if (!value) {
            output.write('\nInitial administrator password is required. Try again: ');
            continue;
          }
          finish(undefined, value);
        } else if (character === '\u007f') {
          value = value.slice(0, -1);
        } else {
          value += character;
        }
      }
    };
    const onEnd = () => finish(new Error('INITIAL_ADMIN_PASSWORD_INPUT_REQUIRED_EOF'));
    const finish = (error?: Error, result?: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      output.write('\n');
      if (error) reject(error);
      else resolve(result!);
    };
    const cleanup = () => {
      terminal.setRawMode?.(false);
      input.off('data', onData);
      input.off('end', onEnd);
    };
    input.on('data', onData);
    input.once('end', onEnd);
  });
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Initial administrator bootstrap failed.');
    process.exitCode = 1;
  });
}

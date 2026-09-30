import { AuthProvider, UserRoleType, UserStatus } from '@prisma/client';
import {
  bootstrapInitialAdmin,
  readInitialAdminInput,
  type InitialAdminDatabase,
} from '../../scripts/initial-admin-bootstrap';

function createDatabase() {
  const state = {
    users: [] as Array<Record<string, unknown>>,
    emails: [] as Array<Record<string, unknown>>,
    identities: [] as Array<Record<string, unknown>>,
    roles: [] as Array<Record<string, unknown>>,
  };
  let sequence = 0;
  const id = () => `id-${++sequence}`;
  const db = {
    userEmail: {
      findMany: jest.fn(async () =>
        state.emails.map((email) => ({
          ...email,
          user: {
            ...state.users.find((user) => user.id === email.userId),
            roles: state.roles.filter((role) => role.userId === email.userId),
            authIdentities: state.identities.filter(
              (identity) => identity.userId === email.userId,
            ),
            patientProfile: null,
            practitionerProfile: null,
          },
        })),
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const email = { id: id(), ...data };
        state.emails.push(email);
        return email;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const email = state.emails.find((item) => item.id === where.id);
        Object.assign(email!, data);
        return email;
      }),
    },
    user: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const user = { id: id(), ...data };
        state.users.push(user);
        return user;
      }),
    },
    authIdentity: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const identity = { id: id(), ...data };
        state.identities.push(identity);
        return identity;
      }),
    },
    userRole: {
      upsert: jest.fn(async ({ create }: { create: Record<string, unknown> }) => {
        const existing = state.roles.find(
          (role) => role.userId === create.userId && role.role === create.role,
        );
        if (existing) return existing;
        const role = { id: id(), ...create };
        state.roles.push(role);
        return role;
      }),
    },
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) => callback(db)),
    _state: state,
  };
  return db as unknown as InitialAdminDatabase & { _state: typeof state };
}

const input = {
  email: ' First.Admin@Example.com ',
  name: 'First Production Admin',
  password: 'A-secure-one-time-password-123!',
};

test('creates one active password Super Admin without persisting the cleartext password', async () => {
  const db = createDatabase();

  const result = await bootstrapInitialAdmin(db, input);

  expect(result.status).toBe('created');
  expect(db._state.users).toHaveLength(1);
  expect(db._state.emails).toEqual([
    expect.objectContaining({
      email: 'first.admin@example.com',
      isPrimary: true,
      isVerified: true,
    }),
  ]);
  expect(db._state.users[0]).toMatchObject({
    displayName: input.name,
    status: UserStatus.ACTIVE,
  });
  expect(db._state.identities).toHaveLength(1);
  expect(db._state.identities[0]).toMatchObject({
    provider: AuthProvider.PASSWORD,
    isEnabled: true,
  });
  expect(db._state.identities[0].passwordHash).not.toBe(input.password);
  expect(db._state.roles).toEqual([
    expect.objectContaining({ role: UserRoleType.SUPER_ADMIN }),
  ]);
});

test('is idempotent and does not replace the existing password or duplicate role records', async () => {
  const db = createDatabase();

  const first = await bootstrapInitialAdmin(db, input);
  const passwordHash = db._state.identities[0].passwordHash;
  const second = await bootstrapInitialAdmin(db, {
    ...input,
    password: 'A-different-one-time-password-456!',
  });

  expect(first.status).toBe('created');
  expect(second.status).toBe('already_configured');
  expect(db._state.users).toHaveLength(1);
  expect(db._state.emails).toHaveLength(1);
  expect(db._state.identities).toHaveLength(1);
  expect(db._state.identities[0].passwordHash).toBe(passwordHash);
  expect(db._state.roles).toHaveLength(1);
});

test('fails closed when the normalized email belongs to a patient identity', async () => {
  const db = createDatabase();
  db._state.users.push({
    id: 'existing-user',
    displayName: 'Existing Patient',
    status: UserStatus.ACTIVE,
  });
  db._state.emails.push({
    id: 'existing-email',
    userId: 'existing-user',
    email: 'first.admin@example.com',
    isPrimary: true,
    isVerified: true,
  });
  db._state.roles.push({
    id: 'existing-role',
    userId: 'existing-user',
    role: UserRoleType.PATIENT,
  });

  await expect(bootstrapInitialAdmin(db, input)).rejects.toThrow(
    /incompatible identity state/,
  );
  expect(db._state.identities).toHaveLength(0);
  expect(db._state.roles).toHaveLength(1);
});

test('preserves unrelated Super Admin assignments', async () => {
  const db = createDatabase();
  db._state.users.push({
    id: 'other-admin',
    displayName: 'Other Admin',
    status: UserStatus.ACTIVE,
  });
  db._state.roles.push({
    id: 'other-role',
    userId: 'other-admin',
    role: UserRoleType.SUPER_ADMIN,
  });

  await bootstrapInitialAdmin(db, input);

  expect(db._state.roles).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        userId: 'other-admin',
        role: UserRoleType.SUPER_ADMIN,
      }),
      expect.objectContaining({ role: UserRoleType.SUPER_ADMIN }),
    ]),
  );
});

test('requires the one-time operator contract without exposing the password', () => {
  expect(
    readInitialAdminInput({
      PRODUCTION_INITIAL_ADMIN_EMAIL: ' FIRST.ADMIN@example.com ',
      PRODUCTION_INITIAL_ADMIN_NAME: 'First Production Admin',
      PRODUCTION_INITIAL_ADMIN_PASSWORD: input.password,
    }),
  ).toEqual({
    email: 'first.admin@example.com',
    name: 'First Production Admin',
    password: input.password,
  });
  expect(() =>
    readInitialAdminInput({
      PRODUCTION_INITIAL_ADMIN_EMAIL: 'first.admin@example.com',
      PRODUCTION_INITIAL_ADMIN_NAME: 'First Production Admin',
      PRODUCTION_INITIAL_ADMIN_PASSWORD: 'too-short',
    }),
  ).toThrow(/at least 16 characters/);
});

test('retries a unique conflict so concurrent first runs converge on one result', async () => {
  const db = createDatabase();
  const transaction = db.$transaction as jest.Mock;
  const original = transaction.getMockImplementation()!;
  transaction
    .mockRejectedValueOnce({ code: 'P2002' })
    .mockImplementationOnce(original);

  const result = await bootstrapInitialAdmin(db, input);

  expect(result.status).toBe('created');
  expect(transaction).toHaveBeenCalledTimes(2);
  expect(db._state.users).toHaveLength(1);
  expect(db._state.emails).toHaveLength(1);
});

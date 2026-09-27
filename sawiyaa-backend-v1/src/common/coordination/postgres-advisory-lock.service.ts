import { Injectable, OnModuleDestroy } from '@nestjs/common';

type PostgresClient = {
  connect(): Promise<void>;
  query<T extends Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[] }>;
  end(): Promise<void>;
};

export type PostgresAdvisoryLockLease = {
  release(): Promise<void>;
};

const TRY_ACQUIRE_SQL =
  'SELECT pg_try_advisory_lock(hashtext($1)::bigint) AS acquired';
const RELEASE_SQL =
  'SELECT pg_advisory_unlock(hashtext($1)::bigint) AS released';

@Injectable()
export class PostgresAdvisoryLockService implements OnModuleDestroy {
  private readonly activeClients = new Set<PostgresClient>();

  async tryAcquire(
    lockIdentity: string,
  ): Promise<PostgresAdvisoryLockLease | null> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required for advisory lock acquisition');
    }

    const client = this.createClient(databaseUrl);
    this.activeClients.add(client);

    try {
      await client.connect();
      const result = await client.query<{ acquired: boolean }>(
        TRY_ACQUIRE_SQL,
        [lockIdentity],
      );
      if (!result.rows[0]?.acquired) {
        await this.closeClient(client);
        return null;
      }

      let released = false;
      return {
        release: async () => {
          if (released) {
            return;
          }

          released = true;
          try {
            await client.query<{ released: boolean }>(RELEASE_SQL, [
              lockIdentity,
            ]);
          } finally {
            await this.closeClient(client);
          }
        },
      };
    } catch (error) {
      await this.closeClient(client);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    const clients = [...this.activeClients];
    await Promise.all(clients.map((client) => this.closeClient(client)));
  }

  private createClient(connectionString: string): PostgresClient {
    const { Client } = require('pg') as {
      Client: new (options: { connectionString: string }) => PostgresClient;
    };
    return new Client({ connectionString });
  }

  private async closeClient(client: PostgresClient): Promise<void> {
    this.activeClients.delete(client);
    await client.end();
  }
}

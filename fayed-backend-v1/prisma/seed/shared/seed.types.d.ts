import { PrismaClient } from '@prisma/client';
export interface SeedModule {
    name: string;
    run: (prisma: PrismaClient) => Promise<void>;
}

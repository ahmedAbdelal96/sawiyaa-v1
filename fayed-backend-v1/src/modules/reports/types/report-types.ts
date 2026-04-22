import { Prisma } from '@prisma/client';

export type Money = Prisma.Decimal;

export type TrendPoint = {
  date: string; // YYYY-MM-DD in UTC
  value: string; // fixed(2)
};

export type PaginatedResult<T> = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  items: T[];
};


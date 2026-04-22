import { PrismaClient } from '@prisma/client';
import { SeedModule } from '../shared/seed.types';

/**
 * Audit seed module keeps AuditEvent storage aligned with seeded notification runtime data.
 * This guarantees admin audit APIs have deterministic data after db reset + seed.
 */
export const auditEventsSeedModule: SeedModule = {
  name: 'audit-events',
  async run(prisma: PrismaClient): Promise<void> {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "AuditEvent" (
        "id",
        "typeSlug",
        "eventFamily",
        "category",
        "status",
        "source",
        "actorUserId",
        "targetEntityType",
        "targetEntityId",
        "titleSnapshot",
        "subjectSnapshot",
        "bodySnapshot",
        "suppressedReason",
        "metadataJson",
        "notificationId",
        "occurredAt",
        "createdAt",
        "updatedAt"
      )
      SELECT
        n."id",
        nt."slug",
        split_part(nt."slug", '.', 1),
        nt."category",
        n."status",
        CASE
          WHEN n."channel" = 'IN_APP' THEN 'IN_APP'::"AuditEventSource"
          WHEN n."channel" = 'EMAIL' THEN 'EMAIL'::"AuditEventSource"
          WHEN n."channel" = 'SMS' THEN 'SMS'::"AuditEventSource"
          WHEN n."channel" = 'PUSH' THEN 'PUSH'::"AuditEventSource"
          ELSE 'SYSTEM'::"AuditEventSource"
        END,
        n."userId",
        n."relatedEntityType",
        n."relatedEntityId",
        n."titleSnapshot",
        n."subjectSnapshot",
        n."bodySnapshot",
        n."suppressedReason",
        n."payloadJson",
        n."id",
        COALESCE(n."updatedAt", n."createdAt"),
        n."createdAt",
        n."updatedAt"
      FROM "Notification" n
      INNER JOIN "NotificationType" nt
        ON nt."id" = n."notificationTypeId"
      ON CONFLICT ("notificationId")
      DO UPDATE SET
        "typeSlug" = EXCLUDED."typeSlug",
        "eventFamily" = EXCLUDED."eventFamily",
        "category" = EXCLUDED."category",
        "status" = EXCLUDED."status",
        "source" = EXCLUDED."source",
        "actorUserId" = EXCLUDED."actorUserId",
        "targetEntityType" = EXCLUDED."targetEntityType",
        "targetEntityId" = EXCLUDED."targetEntityId",
        "titleSnapshot" = EXCLUDED."titleSnapshot",
        "subjectSnapshot" = EXCLUDED."subjectSnapshot",
        "bodySnapshot" = EXCLUDED."bodySnapshot",
        "suppressedReason" = EXCLUDED."suppressedReason",
        "metadataJson" = EXCLUDED."metadataJson",
        "occurredAt" = EXCLUDED."occurredAt",
        "updatedAt" = EXCLUDED."updatedAt";
    `);
  },
};

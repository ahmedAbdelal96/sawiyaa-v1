"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditEventsSeedModule = void 0;
exports.auditEventsSeedModule = {
    name: 'audit-events',
    async run(prisma) {
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
//# sourceMappingURL=audit-events.seed.js.map
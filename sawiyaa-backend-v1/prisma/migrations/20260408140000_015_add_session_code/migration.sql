ALTER TABLE "Session"
ADD COLUMN "sessionCode" VARCHAR(32);

WITH ranked_sessions AS (
  SELECT
    s.id,
    EXTRACT(YEAR FROM COALESCE(s."scheduledStartAt", s."createdAt"))::int AS session_year,
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM COALESCE(s."scheduledStartAt", s."createdAt"))::int
      ORDER BY COALESCE(s."createdAt", now()), s.id
    ) AS seq
  FROM "Session" s
)
UPDATE "Session" s
SET "sessionCode" = CONCAT(
  'SES-',
  ranked_sessions.session_year::text,
  '-',
  LPAD(ranked_sessions.seq::text, 6, '0')
)
FROM ranked_sessions
WHERE ranked_sessions.id = s.id
  AND s."sessionCode" IS NULL;

ALTER TABLE "Session"
ALTER COLUMN "sessionCode" SET NOT NULL;

CREATE UNIQUE INDEX "Session_sessionCode_key" ON "Session"("sessionCode");

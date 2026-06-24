BEGIN;

CREATE UNIQUE INDEX "UserEmail_email_lower_unique_idx"
ON "UserEmail" (lower("email"));

CREATE UNIQUE INDEX "AuthIdentity_user_password_unique_idx"
ON "AuthIdentity" ("userId")
WHERE "provider" = 'PASSWORD';

COMMIT;

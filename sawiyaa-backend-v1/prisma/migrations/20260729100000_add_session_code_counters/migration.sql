CREATE TABLE "session_code_counters" (
    "date_key" VARCHAR(6) NOT NULL,
    "current_value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_code_counters_pkey" PRIMARY KEY ("date_key")
);

ALTER TABLE "session_code_counters"
ADD CONSTRAINT "session_code_counters_current_value_check"
CHECK ("current_value" >= 0 AND "current_value" <= 9999);

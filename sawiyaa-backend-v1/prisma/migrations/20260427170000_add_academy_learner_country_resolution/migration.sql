-- Track how academy learner country was resolved so pricing can rely on server-owned data.
ALTER TABLE "AcademyLearner"
ADD COLUMN "countryCodeDeclared" VARCHAR(10),
ADD COLUMN "countryCodeSource" VARCHAR(30),
ADD COLUMN "countryCodeMismatch" BOOLEAN NOT NULL DEFAULT false;

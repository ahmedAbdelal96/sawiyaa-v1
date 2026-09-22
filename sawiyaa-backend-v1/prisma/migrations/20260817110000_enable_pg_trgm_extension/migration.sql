-- BLOC-2F1B1: enable the PostgreSQL capability used by the translation
-- substring-search indexes. Index creation is intentionally handled by the
-- dedicated non-transactional deployment utility because CONCURRENTLY cannot
-- run inside a migration transaction.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

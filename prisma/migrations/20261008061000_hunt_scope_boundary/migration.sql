ALTER TABLE "HuntScope" ADD COLUMN "activationOrdinal" INTEGER NOT NULL DEFAULT 0;
-- Older development scopes have no trustworthy creation ordinal. Fail closed:
-- new response plans require newly persisted evidence after this migration.
UPDATE "HuntScope" SET "activationOrdinal" = (SELECT COALESCE(MAX("ordinal"), 0) FROM "SecurityEvent");

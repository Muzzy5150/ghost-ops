-- Never infer credential proof for legacy observations.
ALTER TABLE "ToolRequest" ADD COLUMN "identityVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SecurityEvent" ADD COLUMN "identityVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SecurityEvent" ADD COLUMN "ordinal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Incident" ADD COLUMN "identityVerified" BOOLEAN NOT NULL DEFAULT false;
UPDATE "SecurityEvent" SET "ordinal" = (SELECT n FROM (SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", rowid) AS n FROM "SecurityEvent") ranked WHERE ranked."id" = "SecurityEvent"."id");
CREATE INDEX "SecurityEvent_ordinal_idx" ON "SecurityEvent"("ordinal");

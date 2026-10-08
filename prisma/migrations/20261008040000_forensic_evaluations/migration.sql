ALTER TABLE "ExperimentRun" ADD COLUMN "scenarioVersion" TEXT NOT NULL DEFAULT '1.0';
ALTER TABLE "ExperimentRun" ADD COLUMN "configuration" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ExperimentRun" ADD COLUMN "providerCredentialDigest" TEXT;
ALTER TABLE "ModelInvocation" ADD COLUMN "reportedModel" TEXT;
ALTER TABLE "ModelInvocation" ADD COLUMN "provenance" TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE "ModelInvocation" ADD COLUMN "errorCode" TEXT;

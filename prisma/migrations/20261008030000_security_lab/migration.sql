CREATE TABLE "ExperimentRun" (
  "id" TEXT NOT NULL PRIMARY KEY, "commandId" TEXT NOT NULL, "fingerprint" TEXT NOT NULL,
  "scenario" TEXT NOT NULL, "mode" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "sessionId" TEXT, "credentialId" TEXT, "status" TEXT NOT NULL DEFAULT 'queued',
  "slot" TEXT, "workerId" TEXT NOT NULL, "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
  "budgets" JSONB NOT NULL, "results" JSONB NOT NULL,
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "finishedAt" DATETIME
);
CREATE UNIQUE INDEX "ExperimentRun_commandId_key" ON "ExperimentRun"("commandId");
CREATE UNIQUE INDEX "ExperimentRun_slot_key" ON "ExperimentRun"("slot");
CREATE TABLE "ExperimentObservation" (
  "id" TEXT NOT NULL PRIMARY KEY, "runId" TEXT NOT NULL, "kind" TEXT NOT NULL, "ordinal" INTEGER NOT NULL DEFAULT 0, "phase" TEXT NOT NULL,
  "requestId" TEXT, "eventId" TEXT, "details" JSONB NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("runId") REFERENCES "ExperimentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ExperimentObservation_runId_createdAt_idx" ON "ExperimentObservation"("runId", "createdAt");
CREATE TABLE "ModelInvocation" (
  "id" TEXT NOT NULL PRIMARY KEY, "runId" TEXT NOT NULL, "provider" TEXT NOT NULL, "model" TEXT NOT NULL,
  "status" TEXT NOT NULL, "responseId" TEXT, "latencyMs" INTEGER, "inputTokens" INTEGER,
  "outputTokens" INTEGER, "totalTokens" INTEGER, "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" DATETIME,
  FOREIGN KEY ("runId") REFERENCES "ExperimentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ModelInvocation_runId_startedAt_idx" ON "ModelInvocation"("runId", "startedAt");

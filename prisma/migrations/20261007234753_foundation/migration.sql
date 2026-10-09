-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "trust" TEXT NOT NULL DEFAULT 'authorized',
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Credential_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceTrust" TEXT NOT NULL DEFAULT 'trusted',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Profile" (
    "agentId" TEXT NOT NULL PRIMARY KEY,
    "observations" INTEGER NOT NULL DEFAULT 0,
    "tools" JSONB NOT NULL,
    "resources" JSONB NOT NULL,
    "destinations" JSONB NOT NULL,
    "sequences" JSONB NOT NULL,
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ToolRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fingerprint" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "destination" TEXT,
    "sourceId" TEXT,
    "runId" TEXT,
    "allowed" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PolicyDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "rule" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PolicyDecision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ToolRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "requestId" TEXT,
    "runId" TEXT,
    "module" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "incidentId" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ToolRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SecurityEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    CONSTRAINT "Finding_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecurityEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "correlationKey" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'investigating',
    "reasons" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incidentId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Evidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evidence_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecurityEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemoryVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "parentId" TEXT,
    "sourceId" TEXT NOT NULL,
    "sourceTrust" TEXT NOT NULL,
    "sessionId" TEXT,
    "authorization" TEXT NOT NULL,
    "protected" BOOLEAN NOT NULL DEFAULT true,
    "integrity" TEXT NOT NULL DEFAULT 'verified',
    "restoredFromId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemoryVersion_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Honeypot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "TrapInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trapId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "incidentId" TEXT,
    "operation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrapInteraction_trapId_fkey" FOREIGN KEY ("trapId") REFERENCES "Honeypot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContainmentAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dedupeKey" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "incidentId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContainmentAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SimulationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Command" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fingerprint" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "trust" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Credential_digest_key" ON "Credential"("digest");

-- CreateIndex
CREATE INDEX "ToolRequest_actorId_createdAt_idx" ON "ToolRequest"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyDecision_requestId_key" ON "PolicyDecision"("requestId");

-- CreateIndex
CREATE INDEX "SecurityEvent_actorId_createdAt_idx" ON "SecurityEvent"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_correlationKey_key" ON "Incident"("correlationKey");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_eventId_key" ON "Evidence"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryVersion_ownerId_key_version_key" ON "MemoryVersion"("ownerId", "key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Honeypot_resource_key" ON "Honeypot"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "TrapInteraction_requestId_key" ON "TrapInteraction"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContainmentAction_dedupeKey_key" ON "ContainmentAction"("dedupeKey");

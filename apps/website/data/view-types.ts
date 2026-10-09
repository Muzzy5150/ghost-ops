// Public presentation contract, extracted from Phase 12 State; contains no server imports.
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type State = {
    agents: {
        profile: {
            updatedAt: string;
            agentId: string;
            observations: number;
            tools: JsonValue;
            resources: JsonValue;
            destinations: JsonValue;
            sequences: JsonValue;
            frozen: boolean;
        } | null;
        id: string;
        name: string;
        role: string;
        permissions: JsonValue;
        status: string;
        trust: string;
        simulated: boolean;
        integrationType: string;
        createdAt: string;
    }[];
    events: {
        findings: {
            id: string;
            module: string;
            explanation: string;
            eventId: string;
            rule: string;
        }[];
        id: string;
        simulated: boolean;
        createdAt: string;
        actorId: string;
        identityVerified: boolean;
        ordinal: number;
        sessionId: string | null;
        requestId: string | null;
        runId: string | null;
        module: string;
        kind: string;
        severity: string;
        message: string;
        details: JsonValue;
        incidentId: string | null;
    }[];
    incidents: {
        evidence: {
            id: string;
            createdAt: string;
            incidentId: string;
            eventId: string;
            summary: string;
        }[];
        events: {
            request: {
                id: string;
                simulated: boolean;
                identityVerified: boolean;
                tool: string;
                operation: string;
                resource: string;
                allowed: boolean;
                reason: string;
                execution: JsonValue;
            } | null;
            id: string;
            simulated: boolean;
            createdAt: string;
            actorId: string;
            identityVerified: boolean;
            ordinal: number;
            sessionId: string | null;
            requestId: string | null;
            runId: string | null;
            module: string;
            kind: string;
            severity: string;
            message: string;
            details: JsonValue;
            incidentId: string | null;
        }[];
        actions: {
            id: string;
            createdAt: string;
            actorId: string;
            incidentId: string | null;
            reason: string;
            dedupeKey: string;
            action: string;
            operator: string;
        }[];
        id: string;
        status: string;
        simulated: boolean;
        createdAt: string;
        actorId: string;
        identityVerified: boolean;
        sessionId: string | null;
        severity: string;
        correlationKey: string;
        title: string;
        reasons: JsonValue;
        explanation: string;
        recommendation: string;
        updatedAt: string;
    }[];
    memories: {
        integrity: string;
        id: string;
        createdAt: string;
        sessionId: string | null;
        sourceId: string;
        ownerId: string;
        key: string;
        version: number;
        content: string;
        contentHash: string;
        parentId: string | null;
        sourceTrust: string;
        authorization: string;
        protected: boolean;
        restoredFromId: string | null;
    }[];
    traps: {
        _count: {
            interactions: number;
        };
        id: string;
        name: string;
        tool: string;
        resource: string;
        category: string;
        description: string;
        active: boolean;
    }[];
    interactions: {
        id: string;
        createdAt: string;
        actorId: string;
        sessionId: string;
        requestId: string;
        incidentId: string | null;
        operation: string;
        trapId: string;
        eventId: string;
    }[];
    runs: {
        id: string;
        status: string;
        scenario: string;
        results: JsonValue;
        startedAt: string;
        finishedAt: string | null;
    }[];
    actions: {
        id: string;
        createdAt: string;
        actorId: string;
        incidentId: string | null;
        reason: string;
        dedupeKey: string;
        action: string;
        operator: string;
    }[];
    sources: {
        id: string;
        name: string;
        trust: string;
        content: string;
        contentHash: string;
    }[];
    sessions: {
        id: string;
        createdAt: string;
        sourceId: string | null;
        sourceTrust: string;
        active: boolean;
        agentId: string;
    }[];
    runtimeRequests: {
        id: string;
        createdAt: string;
        actorId: string;
        identityVerified: boolean;
        sessionId: string;
        tool: string;
        operation: string;
        resource: string;
        sourceId: string | null;
        allowed: boolean;
        reason: string;
        execution: JsonValue;
    }[];
    runtimeCount: number;
    stats: {
        registered: number;
        authorized: number;
        unknown: number;
        activeIncidents: number;
        incidents: number;
        anomalies: number;
        memoryEvents: number;
        trapTriggers: number;
        quarantined: number;
        requests: number;
        blocked: number;
    };
    generatedAt: string;
    mode: "local-runtime-and-simulation" | "isolated-simulation";
};
export type Agent = State['agents'][number];
export type Event = State['events'][number];
export type Incident = State['incidents'][number];
export type Memory = State['memories'][number];

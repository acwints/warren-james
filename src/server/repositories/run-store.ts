import type {
  AuditEvent,
  LaunchReadinessSignal,
  NextAction,
  ReviewItem,
  ReviewStatus,
  SourceEvent,
  SourceEventStatus,
  WorkflowRun,
  WorkflowStep,
  WorkflowStepKey,
} from "@/domain/workflow";
import { stepCatalog } from "@/domain/workflow";
import type { CreatorProfile } from "@/domain/creator";

type RunStoreState = {
  events: Map<string, SourceEvent>;
  runs: Map<string, WorkflowRun>;
};

declare global {
  var __warrenJamesRunStore: RunStoreState | undefined;
}

function getState(): RunStoreState {
  if (!globalThis.__warrenJamesRunStore) {
    globalThis.__warrenJamesRunStore = { events: new Map(), runs: new Map() };
  }

  if (!globalThis.__warrenJamesRunStore.events) {
    globalThis.__warrenJamesRunStore.events = new Map();
  }

  if (!globalThis.__warrenJamesRunStore.runs) {
    globalThis.__warrenJamesRunStore.runs = new Map();
  }

  return globalThis.__warrenJamesRunStore;
}

export function createSourceEvent(input: {
  provider: SourceEvent["provider"];
  eventType: string;
  externalId: string;
  objectId?: string;
  objectType?: string;
  fingerprint: string;
  rawSummary: string;
}) {
  const event: SourceEvent = {
    id: `event_${crypto.randomUUID()}`,
    duplicateDeliveries: 0,
    receivedAt: new Date().toISOString(),
    status: "received",
    ...input,
  };

  getState().events.set(event.id, event);
  return structuredClone(event);
}

export function findSourceEventByFingerprint(fingerprint: string) {
  const event = Array.from(getState().events.values()).find(
    (candidate) => candidate.fingerprint === fingerprint,
  );
  return event ? structuredClone(normalizeSourceEvent(event)) : null;
}

export function updateSourceEvent(
  eventId: string,
  patch: Partial<Pick<SourceEvent, "duplicateDeliveries" | "relatedRunId" | "rawSummary">> & {
    status?: SourceEventStatus;
  },
) {
  const event = getState().events.get(eventId);

  if (!event) {
    throw new Error(`Source event not found: ${eventId}`);
  }

  const nextEvent = { ...event, ...patch };
  getState().events.set(eventId, nextEvent);
  return structuredClone(nextEvent);
}

export function getSourceEvents() {
  return Array.from(getState().events.values())
    .map((event) => structuredClone(normalizeSourceEvent(event)))
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export function resetRunStoreForTests() {
  globalThis.__warrenJamesRunStore = { events: new Map(), runs: new Map() };
}

export function createRunRecord(input: {
  creator: CreatorProfile;
  source: WorkflowRun["source"];
  triggeredBy: string;
  dryRun: boolean;
  sourceEventId?: string;
  retryOfRunId?: string;
  attempt?: number;
}) {
  const run: WorkflowRun = {
    id: `run_${crypto.randomUUID()}`,
    creatorId: input.creator.id,
    creatorName: input.creator.name,
    creatorSnapshot: input.creator,
    source: input.source,
    sourceEventId: input.sourceEventId,
    workflowTemplateVersion: "kickoff-v1.1",
    attempt: input.attempt ?? 1,
    retryOfRunId: input.retryOfRunId,
    status: "running",
    startedAt: new Date().toISOString(),
    triggeredBy: input.triggeredBy,
    dryRun: input.dryRun,
    steps: stepCatalog.map((step) => ({ ...step, status: "queued" })),
    artifacts: [],
    auditLog: [],
    reviewItems: [],
    readiness: [],
    nextActions: [],
  };

  getState().runs.set(run.id, run);
  return structuredClone(run);
}

export function updateStep(
  runId: string,
  key: WorkflowStepKey,
  patch: Partial<WorkflowStep>,
) {
  const run = getMutableRun(runId);
  run.steps = run.steps.map((step) => (step.key === key ? { ...step, ...patch } : step));
  return structuredClone(run);
}

export function addArtifact(runId: string, artifact: WorkflowRun["artifacts"][number]) {
  const run = getMutableRun(runId);
  run.artifacts.push(artifact);
  return structuredClone(run);
}

export function addAuditEvent(runId: string, event: Omit<AuditEvent, "id" | "at">) {
  const run = getMutableRun(runId);
  run.auditLog.push({
    id: `audit_${crypto.randomUUID()}`,
    at: new Date().toISOString(),
    ...event,
  });
  return structuredClone(run);
}

export function addReviewItems(runId: string, items: Array<Omit<ReviewItem, "id">>) {
  const run = getMutableRun(runId);
  run.reviewItems.push(
    ...items.map((item) => ({
      ...item,
      id: `review_${crypto.randomUUID()}`,
    })),
  );
  return structuredClone(run);
}

export function updateReviewItemStatus(runId: string, itemId: string, status: ReviewStatus) {
  const run = getMutableRun(runId);
  run.reviewItems = run.reviewItems.map((item) =>
    item.id === itemId ? { ...item, status } : item,
  );
  return structuredClone(run);
}

export function setReadiness(runId: string, readiness: LaunchReadinessSignal[]) {
  const run = getMutableRun(runId);
  run.readiness = readiness;
  return structuredClone(run);
}

export function setNextActions(runId: string, nextActions: NextAction[]) {
  const run = getMutableRun(runId);
  run.nextActions = nextActions;
  return structuredClone(run);
}

export function getOpenReviewItems() {
  return Array.from(getState().runs.values())
    .flatMap((run) =>
      run.reviewItems.map((item) => ({
        ...structuredClone(item),
        creatorName: run.creatorName,
        runId: run.id,
      })),
    )
    .filter((item) => item.status !== "approved")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function completeRun(runId: string, status: WorkflowRun["status"]) {
  const run = getMutableRun(runId);
  run.status = status;
  run.completedAt = new Date().toISOString();
  return structuredClone(run);
}

export function getRun(runId: string) {
  const run = getState().runs.get(runId);
  return run ? structuredClone(run) : null;
}

export function getRunSummaries() {
  return Array.from(getState().runs.values())
    .map((run) => structuredClone(run))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function getMutableRun(runId: string) {
  const run = getState().runs.get(runId);

  if (!run) {
    throw new Error(`Workflow run not found: ${runId}`);
  }

  return run;
}

function normalizeSourceEvent(event: SourceEvent): SourceEvent {
  return {
    ...event,
    duplicateDeliveries: event.duplicateDeliveries ?? 0,
  };
}

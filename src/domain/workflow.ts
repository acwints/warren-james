import type { CreatorProfile } from "./creator";

export type WorkflowStepKey =
  | "executive-email"
  | "biz-dev-handoff"
  | "pod-assignment"
  | "asana-project";

export type StepStatus = "queued" | "running" | "completed" | "failed" | "skipped";

export type ArtifactKind = "email" | "document" | "sheet-row" | "asana-project" | "audit";

export type WorkflowArtifact = {
  id: string;
  kind: ArtifactKind;
  label: string;
  url?: string;
  metadata: Record<string, string | number | boolean>;
};

export type WorkflowStep = {
  key: WorkflowStepKey;
  label: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  message?: string;
  artifact?: WorkflowArtifact;
};

export type WorkflowRunStatus = "running" | "completed" | "failed";

export type ReviewStatus = "needs-review" | "approved" | "blocked";

export type ReviewItem = {
  id: string;
  title: string;
  owner: string;
  status: ReviewStatus;
  dueAt: string;
  source: "automation" | "leadership" | "biz-dev";
  detail: string;
};

export type LaunchReadinessSignal = {
  label: string;
  status: "ready" | "attention" | "blocked";
  detail: string;
};

export type NextAction = {
  id: string;
  label: string;
  owner: string;
  dueAt: string;
  href?: string;
};

export type WorkflowRun = {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorSnapshot: CreatorProfile;
  source: "hubspot-webhook" | "manual-demo" | "test";
  sourceEventId?: string;
  workflowTemplateVersion: string;
  attempt: number;
  retryOfRunId?: string;
  status: WorkflowRunStatus;
  startedAt: string;
  completedAt?: string;
  triggeredBy: string;
  dryRun: boolean;
  steps: WorkflowStep[];
  artifacts: WorkflowArtifact[];
  auditLog: AuditEvent[];
  reviewItems: ReviewItem[];
  readiness: LaunchReadinessSignal[];
  nextActions: NextAction[];
};

export type SourceEventStatus = "received" | "processed" | "ignored" | "duplicate" | "failed";

export type SourceEvent = {
  id: string;
  provider: "hubspot" | "manual-demo" | "test";
  eventType: string;
  externalId: string;
  objectId?: string;
  objectType?: string;
  fingerprint: string;
  receivedAt: string;
  status: SourceEventStatus;
  duplicateDeliveries: number;
  relatedRunId?: string;
  rawSummary: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
};

export const stepCatalog: Array<Pick<WorkflowStep, "key" | "label">> = [
  { key: "executive-email", label: "Executive kickoff email" },
  { key: "biz-dev-handoff", label: "Biz Dev handoff doc" },
  { key: "pod-assignment", label: "Pod assignment row" },
  { key: "asana-project", label: "Asana launch project" },
];

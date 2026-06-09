import type { CreatorProfile } from "@/domain/creator";
import type { WorkflowArtifact } from "@/domain/workflow";

export type ExecutiveEmailInput = {
  creator: CreatorProfile;
  subject: string;
  preview: string;
  body: string;
  dryRun: boolean;
};

export type HandoffDocInput = {
  creator: CreatorProfile;
  sections: Array<{ heading: string; body: string[] }>;
  dryRun: boolean;
};

export type PodAssignmentInput = {
  creator: CreatorProfile;
  handoffDocUrl?: string;
  dryRun: boolean;
};

export type AsanaProjectInput = {
  creator: CreatorProfile;
  handoffDocUrl?: string;
  podAssignmentUrl?: string;
  dryRun: boolean;
};

export type EmailGateway = {
  sendExecutiveEmail(input: ExecutiveEmailInput): Promise<WorkflowArtifact>;
};

export type DocumentsGateway = {
  createBizDevHandoff(input: HandoffDocInput): Promise<WorkflowArtifact>;
};

export type SheetsGateway = {
  requestPodAssignment(input: PodAssignmentInput): Promise<WorkflowArtifact>;
};

export type ProjectGateway = {
  createLaunchProject(input: AsanaProjectInput): Promise<WorkflowArtifact>;
};

export type AuditGateway = {
  record(action: string, detail: string): Promise<void>;
};

export type KickoffDependencies = {
  email: EmailGateway;
  documents: DocumentsGateway;
  sheets: SheetsGateway;
  projects: ProjectGateway;
  audit: AuditGateway;
};

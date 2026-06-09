import { kickoffRequestSchema, type KickoffRequest } from "@/domain/creator";
import { buildExecutiveEmail, buildHandoffSections } from "@/domain/templates";
import type { WorkflowRun, WorkflowStepKey } from "@/domain/workflow";
import type { KickoffDependencies } from "@/server/ports";
import {
  addArtifact,
  addAuditEvent,
  addReviewItems,
  completeRun,
  createRunRecord,
  getRun,
  updateSourceEvent,
  setNextActions,
  setReadiness,
  updateStep,
} from "@/server/repositories/run-store";

export async function runKickoffAutomation(
  request: KickoffRequest,
  dependencies: KickoffDependencies,
) {
  const parsed = kickoffRequestSchema.parse(request);
  const run = createRunRecord({
    creator: parsed.creator,
    dryRun: parsed.dryRun,
    sourceEventId: parsed.sourceEventId,
    source: parsed.source,
    retryOfRunId: parsed.retryOfRunId,
    attempt: parsed.attempt,
    triggeredBy: parsed.triggeredBy,
  });

  await record(run.id, dependencies, "workflow.started", `${parsed.creator.name} entered Kickoff`);

  try {
    const executiveEmail = await executeStep(run.id, "executive-email", async () => {
      const email = buildExecutiveEmail(parsed.creator);
      return dependencies.email.sendExecutiveEmail({
        creator: parsed.creator,
        dryRun: parsed.dryRun,
        ...email,
      });
    });

    const handoffDoc = await executeStep(run.id, "biz-dev-handoff", async () =>
      dependencies.documents.createBizDevHandoff({
        creator: parsed.creator,
        dryRun: parsed.dryRun,
        sections: buildHandoffSections(parsed.creator),
      }),
    );

    const assignmentRow = await executeStep(run.id, "pod-assignment", async () =>
      dependencies.sheets.requestPodAssignment({
        creator: parsed.creator,
        dryRun: parsed.dryRun,
        handoffDocUrl: handoffDoc.url,
      }),
    );

    await executeStep(run.id, "asana-project", async () =>
      dependencies.projects.createLaunchProject({
        creator: parsed.creator,
        dryRun: parsed.dryRun,
        handoffDocUrl: handoffDoc.url,
        podAssignmentUrl: assignmentRow.url,
      }),
    );

    addReviewItems(run.id, [
      {
        title: "Confirm pod owner and launch lead",
        owner: "Leadership",
        status: "needs-review",
        dueAt: businessDateFromNow(1),
        source: "leadership",
        detail: "Assignment row is ready; leadership should select pod owner before kickoff call.",
      },
      {
        title: "Approve assortment and donation mechanics",
        owner: parsed.creator.executiveSponsor,
        status: parsed.creator.risks.length > 0 ? "needs-review" : "approved",
        dueAt: businessDateFromNow(2),
        source: "automation",
        detail:
          parsed.creator.risks.length > 0
            ? parsed.creator.risks.join(" ")
            : "No material launch risk captured in the kickoff trigger.",
      },
      {
        title: "Validate target launch date",
        owner: parsed.creator.businessDevelopmentOwner,
        status: "needs-review",
        dueAt: businessDateFromNow(3),
        source: "biz-dev",
        detail: `Current target launch date is ${parsed.creator.targetLaunchDate}; confirm after kickoff call.`,
      },
    ]);

    setReadiness(run.id, [
      {
        label: "Kickoff package",
        status: "ready",
        detail: "Email, handoff doc, assignment row, and project artifacts were created.",
      },
      {
        label: "Leadership assignment",
        status: "attention",
        detail: "Pod owner still requires human selection.",
      },
      {
        label: "Launch confidence",
        status: parsed.creator.risks.length > 0 ? "attention" : "ready",
        detail:
          parsed.creator.risks.length > 0
            ? `${parsed.creator.risks.length} review flag(s) need resolution.`
            : "No kickoff risk flags were captured.",
      },
    ]);

    setNextActions(run.id, [
      {
        id: `action_${crypto.randomUUID()}`,
        label: "Review assignment row",
        owner: "Leadership",
        dueAt: businessDateFromNow(1),
        href: assignmentRow.url,
      },
      {
        id: `action_${crypto.randomUUID()}`,
        label: "Use handoff doc in kickoff prep",
        owner: parsed.creator.businessDevelopmentOwner,
        dueAt: businessDateFromNow(2),
        href: handoffDoc.url,
      },
    ]);

    await record(
      run.id,
      dependencies,
      "workflow.completed",
      `${parsed.creator.name} kickoff package created with ${executiveEmail.label}`,
    );

    if (parsed.sourceEventId) {
      updateSourceEvent(parsed.sourceEventId, {
        relatedRunId: run.id,
        status: "processed",
      });
    }

    return completeRun(run.id, "completed");
  } catch (error) {
    await record(
      run.id,
      dependencies,
      "workflow.failed",
      error instanceof Error ? error.message : "Unknown workflow failure",
    );

    if (parsed.sourceEventId) {
      updateSourceEvent(parsed.sourceEventId, {
        relatedRunId: run.id,
        status: "failed",
      });
    }

    return completeRun(run.id, "failed");
  }
}

async function executeStep(
  runId: string,
  key: WorkflowStepKey,
  action: () => Promise<WorkflowRun["artifacts"][number]>,
) {
  updateStep(runId, key, {
    startedAt: new Date().toISOString(),
    status: "running",
  });

  try {
    const artifact = await action();
    addArtifact(runId, artifact);
    updateStep(runId, key, {
      artifact,
      completedAt: new Date().toISOString(),
      message: artifact.label,
      status: "completed",
    });
    return artifact;
  } catch (error) {
    updateStep(runId, key, {
      completedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Unknown step failure",
      status: "failed",
    });
    throw error;
  }
}

async function record(
  runId: string,
  dependencies: KickoffDependencies,
  action: string,
  detail: string,
) {
  await dependencies.audit.record(action, detail);
  addAuditEvent(runId, {
    action,
    actor: "kickoff-orchestrator",
    detail,
  });
}

export function readKickoffRun(runId: string) {
  return getRun(runId);
}

export async function retryKickoffRun(runId: string, dependencies: KickoffDependencies) {
  const existingRun = getRun(runId);

  if (!existingRun) {
    throw new Error(`Workflow run not found: ${runId}`);
  }

  return runKickoffAutomation(
    {
      creator: existingRun.creatorSnapshot,
      dryRun: existingRun.dryRun,
      source: existingRun.source,
      triggeredBy: "operator-retry",
      retryOfRunId: existingRun.id,
      attempt: existingRun.attempt + 1,
    },
    dependencies,
  );
}

function businessDateFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

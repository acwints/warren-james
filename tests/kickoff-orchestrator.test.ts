import { beforeEach, describe, expect, it } from "vitest";
import { getSampleCreator } from "@/data/sample-creators";
import {
  retryKickoffRun,
  runKickoffAutomation,
} from "@/server/application/kickoff-orchestrator";
import { createMockDependencies } from "@/server/integrations/mock";
import {
  createSourceEvent,
  findSourceEventByFingerprint,
  resetRunStoreForTests,
} from "@/server/repositories/run-store";

describe("runKickoffAutomation", () => {
  beforeEach(() => {
    resetRunStoreForTests();
  });

  it("creates the four selected downstream artifacts", async () => {
    const run = await runKickoffAutomation(
      {
        creator: getSampleCreator(),
        dryRun: true,
        source: "test",
        triggeredBy: "vitest",
      },
      createMockDependencies(),
    );

    expect(run.status).toBe("completed");
    expect(run.steps).toHaveLength(4);
    expect(run.steps.every((step) => step.status === "completed")).toBe(true);
    expect(run.artifacts.map((artifact) => artifact.kind)).toEqual([
      "email",
      "document",
      "sheet-row",
      "asana-project",
    ]);
    expect(run.auditLog.map((event) => event.action)).toEqual([
      "workflow.started",
      "workflow.completed",
    ]);
    expect(run.reviewItems).toHaveLength(3);
    expect(run.readiness.map((signal) => signal.label)).toEqual([
      "Kickoff package",
      "Leadership assignment",
      "Launch confidence",
    ]);
    expect(run.nextActions).toHaveLength(2);
  });

  it("stores source event lineage and supports operator retry", async () => {
    const event = createSourceEvent({
      provider: "hubspot",
      eventType: "creator_stage",
      externalId: "creator_stage:hs-194782",
      objectId: "hs-194782",
      objectType: "creator",
      fingerprint: "fingerprint-1",
      rawSummary: "Kickoff stage transition",
    });

    const run = await runKickoffAutomation(
      {
        creator: getSampleCreator(),
        dryRun: true,
        source: "hubspot-webhook",
        sourceEventId: event.id,
        triggeredBy: "hubspot",
      },
      createMockDependencies(),
    );
    const retry = await retryKickoffRun(run.id, createMockDependencies());

    expect(run.sourceEventId).toBe(event.id);
    expect(findSourceEventByFingerprint("fingerprint-1")?.relatedRunId).toBe(run.id);
    expect(retry.retryOfRunId).toBe(run.id);
    expect(retry.attempt).toBe(2);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import {
  createSourceEvent,
  findSourceEventByFingerprint,
  resetRunStoreForTests,
  updateSourceEvent,
} from "@/server/repositories/run-store";

describe("source event repository", () => {
  beforeEach(() => {
    resetRunStoreForTests();
  });

  it("indexes events by fingerprint for webhook idempotency", () => {
    const event = createSourceEvent({
      provider: "hubspot",
      eventType: "creator_stage",
      externalId: "creator_stage:123",
      objectId: "123",
      objectType: "creator",
      fingerprint: "abc123",
      rawSummary: "stage changed",
    });

    updateSourceEvent(event.id, {
      relatedRunId: "run_123",
      status: "processed",
    });

    expect(findSourceEventByFingerprint("abc123")).toMatchObject({
      duplicateDeliveries: 0,
      id: event.id,
      relatedRunId: "run_123",
      status: "processed",
    });
  });

  it("tracks duplicate deliveries without losing the processing status", () => {
    const event = createSourceEvent({
      provider: "hubspot",
      eventType: "creator_stage",
      externalId: "creator_stage:123",
      objectId: "123",
      objectType: "creator",
      fingerprint: "abc123",
      rawSummary: "stage changed",
    });

    updateSourceEvent(event.id, {
      duplicateDeliveries: 1,
      status: "processed",
    });

    expect(findSourceEventByFingerprint("abc123")).toMatchObject({
      duplicateDeliveries: 1,
      status: "processed",
    });
  });
});

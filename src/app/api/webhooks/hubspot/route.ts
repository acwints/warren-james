import { NextResponse } from "next/server";
import {
  describeHubspotSourceEvent,
  parseHubspotKickoffPayloadWithHydration,
  verifyHubspotSignature,
} from "@/server/application/hubspot";
import { runKickoffAutomation } from "@/server/application/kickoff-orchestrator";
import { apiErrorResponse } from "@/server/api/errors";
import { getAppConfig } from "@/server/config";
import { createDefaultDependencies } from "@/server/integrations";
import {
  createSourceEvent,
  findSourceEventByFingerprint,
  getRun,
  updateSourceEvent,
} from "@/server/repositories/run-store";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const config = getAppConfig();
    const signature = request.headers.get("x-hubspot-signature");
    const signatureV3 = request.headers.get("x-hubspot-signature-v3");
    const requestTimestamp = request.headers.get("x-hubspot-request-timestamp");

    if (
      !verifyHubspotSignature({
        body,
        method: request.method,
        requestTimestamp,
        secret: config.hubspotWebhookSecret,
        signature,
        signatureV3,
        url: request.url,
      })
    ) {
      return NextResponse.json({ error: "Invalid HubSpot signature" }, { status: 401 });
    }

    const payload = JSON.parse(body) as unknown;
    const sourceDescriptor = describeHubspotSourceEvent(body, payload);
    const existingEvent = findSourceEventByFingerprint(sourceDescriptor.fingerprint);

    if (existingEvent) {
      const run = existingEvent.relatedRunId ? getRun(existingEvent.relatedRunId) : null;
      const event = updateSourceEvent(existingEvent.id, {
        duplicateDeliveries: existingEvent.duplicateDeliveries + 1,
      });
      return NextResponse.json({ duplicate: true, event, run });
    }

    const sourceEvent = createSourceEvent({
      provider: "hubspot",
      ...sourceDescriptor,
    });

    const kickoffRequest = await parseHubspotKickoffPayloadWithHydration(payload);

    if (!kickoffRequest) {
      updateSourceEvent(sourceEvent.id, { status: "ignored" });
      return NextResponse.json({ ignored: true, reason: "No Kickoff stage transition found" });
    }

    const run = await runKickoffAutomation(
      { ...kickoffRequest, sourceEventId: sourceEvent.id },
      createDefaultDependencies(),
    );

    return NextResponse.json({ event: sourceEvent, run }, { status: run.status === "failed" ? 500 : 202 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

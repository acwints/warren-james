import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getSampleCreator } from "@/data/sample-creators";
import { creatorProfileSchema, type KickoffRequest } from "@/domain/creator";
import { fetchCreatorFromHubspot } from "@/server/integrations/hubspot-client";

const hubspotEventSchema = z.object({
  objectId: z.union([z.string(), z.number()]).optional(),
  propertyName: z.string().optional(),
  propertyValue: z.string().optional(),
  changeSource: z.string().optional(),
});

const hubspotWebhookSchema = z.union([
  z.array(hubspotEventSchema),
  z.object({
    creator: creatorProfileSchema,
    triggeredBy: z.string().optional(),
    dryRun: z.boolean().default(false),
  }),
]);

export type HubspotSourceEventDescriptor = {
  eventType: string;
  externalId: string;
  objectId?: string;
  objectType?: string;
  fingerprint: string;
  rawSummary: string;
};

export function parseHubspotKickoffPayload(payload: unknown): KickoffRequest | null {
  const parsed = hubspotWebhookSchema.parse(payload);

  if (!Array.isArray(parsed)) {
    return {
      creator: parsed.creator,
      dryRun: parsed.dryRun,
      source: "hubspot-webhook",
      triggeredBy: parsed.triggeredBy ?? "hubspot",
    };
  }

  const movedToKickoff = parsed.some((event) => {
    const property = event.propertyName?.toLowerCase() ?? "";
    const value = event.propertyValue?.toLowerCase() ?? "";
    return ["dealstage", "lifecyclestage", "creator_stage", "stage"].includes(property) && value === "kickoff";
  });

  if (!movedToKickoff) {
    return null;
  }

  const objectId = String(parsed[0]?.objectId ?? getSampleCreator().id);
  const creator = { ...getSampleCreator(), id: objectId };

  return {
    creator,
    dryRun: false,
    source: "hubspot-webhook",
    triggeredBy: parsed[0]?.changeSource ?? "hubspot",
  };
}

export async function parseHubspotKickoffPayloadWithHydration(
  payload: unknown,
): Promise<KickoffRequest | null> {
  const kickoffRequest = parseHubspotKickoffPayload(payload);

  if (!kickoffRequest) {
    return null;
  }

  const objectId = kickoffRequest.creator.id;
  const hydratedCreator = await fetchCreatorFromHubspot(objectId);

  return hydratedCreator
    ? {
        ...kickoffRequest,
        creator: hydratedCreator,
      }
    : kickoffRequest;
}

export function describeHubspotSourceEvent(body: string, payload: unknown): HubspotSourceEventDescriptor {
  const parsed = hubspotWebhookSchema.parse(payload);
  const firstEvent = Array.isArray(parsed) ? parsed[0] : undefined;
  const objectId = firstEvent?.objectId ? String(firstEvent.objectId) : undefined;
  const eventType = Array.isArray(parsed)
    ? firstEvent?.propertyName ?? "hubspot-property-change"
    : "hubspot-kickoff-test-payload";

  return {
    eventType,
    externalId: objectId ? `${eventType}:${objectId}` : createHash("sha256").update(body).digest("hex"),
    objectId,
    objectType: "creator",
    fingerprint: createHash("sha256").update(body).digest("hex"),
    rawSummary: Array.isArray(parsed)
      ? `${parsed.length} HubSpot event(s); first property ${eventType}`
      : `Direct kickoff payload for ${parsed.creator.name}`,
  };
}

export function verifyHubspotSignature(input: {
  body: string;
  method?: string;
  requestTimestamp?: string | null;
  secret?: string;
  signature?: string | null;
  signatureV3?: string | null;
  url?: string;
}) {
  if (!input.secret) {
    return true;
  }

  if (input.signatureV3 && input.requestTimestamp && input.method && input.url) {
    const timestamp = Number(input.requestTimestamp);

    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 300_000) {
      return false;
    }

    const source = `${input.method.toUpperCase()}${decodeHubspotSignatureUri(input.url)}${input.body}${input.requestTimestamp}`;
    const digest = createHmac("sha256", input.secret).update(source, "utf8").digest("base64");
    return timingSafeStringEqual(digest, input.signatureV3);
  }

  if (!input.signature) {
    return false;
  }

  const hmacDigest = createHmac("sha256", input.secret).update(input.body).digest("hex");
  const legacyDigest = createHash("sha256").update(`${input.secret}${input.body}`).digest("hex");

  return timingSafeStringEqual(hmacDigest, input.signature) || timingSafeStringEqual(legacyDigest, input.signature);
}

function timingSafeStringEqual(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

function decodeHubspotSignatureUri(uri: string) {
  return [
    ["%3A", ":"],
    ["%2F", "/"],
    ["%3F", "?"],
    ["%40", "@"],
    ["%21", "!"],
    ["%24", "$"],
    ["%27", "'"],
    ["%28", "("],
    ["%29", ")"],
    ["%2A", "*"],
    ["%2C", ","],
    ["%3B", ";"],
  ].reduce((decodedUri, [encoded, decoded]) => decodedUri.replaceAll(new RegExp(encoded, "gi"), decoded), uri);
}

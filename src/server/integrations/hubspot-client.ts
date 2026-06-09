import type { CreatorProfile } from "@/domain/creator";
import { getSampleCreator } from "@/data/sample-creators";
import { providerFetch } from "@/server/integrations/http";

type HubspotPropertyValue = string | number | null | undefined;

type HubspotObjectResponse = {
  id: string;
  properties: Record<string, HubspotPropertyValue>;
};

const defaultProperties = [
  "name",
  "creator_name",
  "handle",
  "creator_handle",
  "category",
  "primary_audience",
  "estimated_reach",
  "business_development_owner",
  "executive_sponsor",
  "target_launch_date",
  "amount",
  "priority",
  "launch_notes",
  "risks",
  "creator_profile_url",
];

export async function fetchCreatorFromHubspot(objectId: string): Promise<CreatorProfile | null> {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

  if (!token) {
    return null;
  }

  const url = new URL(`https://api.hubapi.com/crm/v3/objects/deals/${objectId}`);
  url.searchParams.set("properties", defaultProperties.join(","));

  const response = await providerFetch("hubspot", url.toString(), {
    headers: {
      authorization: `Bearer ${token}`,
    },
    method: "GET",
  });

  const payload = (await response.json()) as HubspotObjectResponse;
  return mapHubspotObjectToCreator(payload);
}

export function mapHubspotObjectToCreator(payload: HubspotObjectResponse): CreatorProfile {
  const fallback = getSampleCreator();
  const properties = payload.properties;
  const name = text(properties.creator_name) ?? text(properties.name) ?? fallback.name;
  const notes = list(properties.launch_notes) ?? fallback.launchNotes;
  const risks = list(properties.risks) ?? fallback.risks;
  const priority = text(properties.priority);

  return {
    ...fallback,
    id: payload.id,
    name,
    handle: text(properties.creator_handle) ?? text(properties.handle) ?? fallback.handle,
    category: text(properties.category) ?? fallback.category,
    primaryAudience: text(properties.primary_audience) ?? fallback.primaryAudience,
    estimatedReach: number(properties.estimated_reach) ?? fallback.estimatedReach,
    businessDevelopmentOwner:
      text(properties.business_development_owner) ?? fallback.businessDevelopmentOwner,
    executiveSponsor: text(properties.executive_sponsor) ?? fallback.executiveSponsor,
    targetLaunchDate: text(properties.target_launch_date) ?? fallback.targetLaunchDate,
    opportunityValue: number(properties.amount) ?? fallback.opportunityValue,
    priority: priority === "standard" || priority === "high" || priority === "urgent" ? priority : fallback.priority,
    launchNotes: notes.length > 0 ? notes : fallback.launchNotes,
    risks,
    links: {
      ...fallback.links,
      hubspot: `https://app.hubspot.com/contacts/0/deal/${payload.id}`,
      creatorProfile: text(properties.creator_profile_url) ?? fallback.links.creatorProfile,
    },
  };
}

function text(value: HubspotPropertyValue) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  return String(value);
}

function number(value: HubspotPropertyValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function list(value: HubspotPropertyValue) {
  const raw = text(value);

  if (!raw) {
    return undefined;
  }

  return raw
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

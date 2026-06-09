import { describe, expect, it } from "vitest";
import { mapHubspotObjectToCreator } from "@/server/integrations/hubspot-client";

describe("mapHubspotObjectToCreator", () => {
  it("normalizes HubSpot object properties into creator profile data", () => {
    const creator = mapHubspotObjectToCreator({
      id: "deal-123",
      properties: {
        creator_name: "Avery Stone",
        creator_handle: "@avery",
        category: "Fitness",
        primary_audience: "Strength training beginners",
        estimated_reach: "1200000",
        business_development_owner: "Jordan Lee",
        executive_sponsor: "VP Growth",
        target_launch_date: "2026-10-01",
        amount: "300000",
        priority: "high",
        launch_notes: "First note;Second note",
        risks: "Risk one\nRisk two",
        creator_profile_url: "https://example.com/avery",
      },
    });

    expect(creator).toMatchObject({
      id: "deal-123",
      name: "Avery Stone",
      handle: "@avery",
      estimatedReach: 1200000,
      opportunityValue: 300000,
      priority: "high",
      launchNotes: ["First note", "Second note"],
      risks: ["Risk one", "Risk two"],
    });
  });
});

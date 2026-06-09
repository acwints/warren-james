import type { CreatorProfile } from "@/domain/creator";

export const sampleCreators: CreatorProfile[] = [
  {
    id: "hs-194782",
    name: "Lee Asher",
    handle: "@theasherhouse",
    category: "Pet rescue and lifestyle",
    primaryAudience: "Animal lovers, family households, cause-led shoppers",
    estimatedReach: 5200000,
    businessDevelopmentOwner: "Maya Cohen",
    executiveSponsor: "WJ Executive Team",
    targetLaunchDate: "2026-08-18",
    kickoffStageEnteredAt: "2026-06-03T16:18:00.000Z",
    opportunityValue: 425000,
    priority: "urgent",
    launchNotes: [
      "Creator has a strong mission-led audience and a high-trust merchandise fit.",
      "Initial assortment should emphasize rescue storytelling, premium basics, and giftable accessories.",
      "Launch window should avoid overlap with the late-July tentpole campaign.",
    ],
    risks: [
      "Assortment approval could slip if creative direction is not locked in the first week.",
      "Executive alignment is needed on donation mechanics before kickoff call.",
    ],
    links: {
      hubspot: "https://app.hubspot.com/contacts/123/company/194782",
      creatorProfile: "https://example.com/creators/lee-asher",
      referenceFolder: "https://drive.google.com/drive/folders/mock-lee-asher",
    },
  },
  {
    id: "hs-204118",
    name: "Nora Fields",
    handle: "@nora.cooks",
    category: "Food and home",
    primaryAudience: "Millennial home cooks and meal-prep shoppers",
    estimatedReach: 1850000,
    businessDevelopmentOwner: "Andre Patel",
    executiveSponsor: "VP Partnerships",
    targetLaunchDate: "2026-09-09",
    kickoffStageEnteredAt: "2026-06-03T18:45:00.000Z",
    opportunityValue: 210000,
    priority: "high",
    launchNotes: [
      "Audience has responded strongly to limited-run kitchen textile drops.",
      "Creator wants a warm but practical assortment with premium materials.",
      "Existing brand photography can seed the handoff doc and kickoff deck.",
    ],
    risks: ["Margin review is needed for small-batch textile production."],
    links: {
      hubspot: "https://app.hubspot.com/contacts/123/company/204118",
      creatorProfile: "https://example.com/creators/nora-fields",
    },
  },
];

export function getSampleCreator(id = "hs-194782") {
  return sampleCreators.find((creator) => creator.id === id) ?? sampleCreators[0];
}

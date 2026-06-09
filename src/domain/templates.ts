import type { CreatorProfile } from "./creator";

const currency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

const reach = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function buildExecutiveEmail(creator: CreatorProfile) {
  const subject = `Kickoff started: ${creator.name}`;
  const preview = `${creator.name} entered Kickoff with ${reach.format(
    creator.estimatedReach,
  )} estimated reach and a ${creator.targetLaunchDate} target launch.`;

  const body = [
    "Hi team,",
    "",
    `${creator.name} (${creator.handle}) has moved into Kickoff. Here is the launch context worth scanning before we assign the pod and open execution.`,
    "",
    `Category: ${creator.category}`,
    `Audience: ${creator.primaryAudience}`,
    `Estimated reach: ${reach.format(creator.estimatedReach)}`,
    `Opportunity value: ${currency.format(creator.opportunityValue)}`,
    `Target launch: ${creator.targetLaunchDate}`,
    `BD owner: ${creator.businessDevelopmentOwner}`,
    `Executive sponsor: ${creator.executiveSponsor}`,
    "",
    "Why now:",
    ...creator.launchNotes.map((note) => `- ${note}`),
    "",
    creator.risks.length > 0 ? "Open risks:" : "Open risks: none captured yet.",
    ...creator.risks.map((risk) => `- ${risk}`),
    "",
    `HubSpot: ${creator.links.hubspot}`,
    `Creator profile: ${creator.links.creatorProfile}`,
  ];

  return { subject, preview, body: body.join("\n") };
}

export function buildHandoffSections(creator: CreatorProfile) {
  return [
    {
      heading: "Creator Snapshot",
      body: [
        `${creator.name} is a ${creator.category} creator with ${reach.format(
          creator.estimatedReach,
        )} estimated reach.`,
        `Primary audience: ${creator.primaryAudience}.`,
        `Target launch date: ${creator.targetLaunchDate}.`,
      ],
    },
    {
      heading: "Commercial Context",
      body: [
        `Opportunity value: ${currency.format(creator.opportunityValue)}.`,
        `Business development owner: ${creator.businessDevelopmentOwner}.`,
        `Executive sponsor: ${creator.executiveSponsor}.`,
      ],
    },
    {
      heading: "Launch Inputs",
      body: creator.launchNotes,
    },
    {
      heading: "Risks And Review",
      body:
        creator.risks.length > 0
          ? creator.risks
          : ["No material launch risks captured at kickoff stage entry."],
    },
  ];
}

import { z } from "zod";

export const creatorProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  handle: z.string().min(1),
  category: z.string().min(1),
  primaryAudience: z.string().min(1),
  estimatedReach: z.number().int().nonnegative(),
  businessDevelopmentOwner: z.string().min(1),
  executiveSponsor: z.string().min(1),
  targetLaunchDate: z.string().min(1),
  kickoffStageEnteredAt: z.string().min(1),
  opportunityValue: z.number().int().nonnegative(),
  priority: z.enum(["standard", "high", "urgent"]),
  launchNotes: z.array(z.string()).min(1),
  risks: z.array(z.string()).default([]),
  links: z.object({
    hubspot: z.string().url(),
    creatorProfile: z.string().url(),
    referenceFolder: z.string().url().optional(),
  }),
});

export type CreatorProfile = z.infer<typeof creatorProfileSchema>;

export const kickoffRequestSchema = z.object({
  creator: creatorProfileSchema,
  triggeredBy: z.string().min(1),
  source: z.enum(["hubspot-webhook", "manual-demo", "test"]),
  dryRun: z.boolean().default(false),
  sourceEventId: z.string().optional(),
  retryOfRunId: z.string().optional(),
  attempt: z.number().int().positive().default(1),
});

export type KickoffRequest = z.input<typeof kickoffRequestSchema>;

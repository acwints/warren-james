import { NextResponse } from "next/server";
import { getSampleCreator } from "@/data/sample-creators";
import { creatorProfileSchema } from "@/domain/creator";
import { runKickoffAutomation } from "@/server/application/kickoff-orchestrator";
import { apiErrorResponse } from "@/server/api/errors";
import { createDefaultDependencies } from "@/server/integrations";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      creatorId?: string;
      creator?: unknown;
      dryRun?: boolean;
    };

    const creator = body.creator
      ? creatorProfileSchema.parse(body.creator)
      : getSampleCreator(body.creatorId);

    const run = await runKickoffAutomation(
      {
        creator,
        dryRun: body.dryRun ?? true,
        source: "manual-demo",
        triggeredBy: "operator-console",
      },
      createDefaultDependencies(),
    );

    return NextResponse.json({ run }, { status: run.status === "failed" ? 500 : 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

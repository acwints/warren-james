import { NextResponse } from "next/server";
import { retryKickoffRun } from "@/server/application/kickoff-orchestrator";
import { apiErrorResponse } from "@/server/api/errors";
import { createDefaultDependencies } from "@/server/integrations";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const run = await retryKickoffRun(id, createDefaultDependencies());

    return NextResponse.json({ run }, { status: run.status === "failed" ? 500 : 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

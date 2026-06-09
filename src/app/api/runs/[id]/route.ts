import { NextResponse } from "next/server";
import { readKickoffRun } from "@/server/application/kickoff-orchestrator";
import { NotFoundError, apiErrorResponse } from "@/server/api/errors";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const run = readKickoffRun(id);

    if (!run) {
      throw new NotFoundError("Run not found");
    }

    return NextResponse.json({ run });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

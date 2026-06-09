import { NextResponse } from "next/server";
import { requireGoogleSession } from "@/server/auth/google";
import { getDashboardSnapshot } from "@/server/application/dashboard";

export async function GET() {
  const { response } = await requireGoogleSession();

  if (response) {
    return response;
  }

  const dashboard = getDashboardSnapshot();
  return NextResponse.json({
    runs: dashboard.runs,
    metrics: dashboard.metrics,
    sourceEvents: dashboard.sourceEvents,
  });
}

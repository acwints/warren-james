import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/server/application/dashboard";

export async function GET() {
  const dashboard = getDashboardSnapshot();
  return NextResponse.json({
    runs: dashboard.runs,
    metrics: dashboard.metrics,
    sourceEvents: dashboard.sourceEvents,
  });
}

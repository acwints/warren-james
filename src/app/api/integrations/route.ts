import { NextResponse } from "next/server";
import { getIntegrationHealth } from "@/server/repositories/integration-store";

export async function GET() {
  return NextResponse.json({ integrations: getIntegrationHealth() });
}

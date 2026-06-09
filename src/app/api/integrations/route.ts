import { NextResponse } from "next/server";
import { requireGoogleSession } from "@/server/auth/google";
import { getIntegrationHealth } from "@/server/repositories/integration-store";

export async function GET() {
  const { response } = await requireGoogleSession();

  if (response) {
    return response;
  }

  return NextResponse.json({ integrations: getIntegrationHealth() });
}

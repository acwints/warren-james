import { NextResponse } from "next/server";
import { requireGoogleSession } from "@/server/auth/google";
import { getSourceEvents } from "@/server/repositories/run-store";

export async function GET() {
  const { response } = await requireGoogleSession();

  if (response) {
    return response;
  }

  return NextResponse.json({ events: getSourceEvents() });
}

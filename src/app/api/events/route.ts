import { NextResponse } from "next/server";
import { getSourceEvents } from "@/server/repositories/run-store";

export async function GET() {
  return NextResponse.json({ events: getSourceEvents() });
}

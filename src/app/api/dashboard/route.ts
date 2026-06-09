import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/server/application/dashboard";

export async function GET() {
  return NextResponse.json(getDashboardSnapshot());
}

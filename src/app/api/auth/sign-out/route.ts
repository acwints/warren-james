import { NextResponse } from "next/server";
import { clearGoogleAuthCookies } from "@/server/auth/google";

export function POST(request: Request) {
  return clearGoogleAuthCookies(NextResponse.redirect(new URL("/", request.url), 303));
}

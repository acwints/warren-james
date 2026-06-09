import { NextResponse } from "next/server";
import {
  GOOGLE_SESSION_COOKIE,
  createDemoSession,
  encryptSession,
  sessionCookieOptions,
  validateDemoCredentials,
} from "@/server/auth/google";

export async function POST(request: Request) {
  const body = await request.formData();
  const username = String(body.get("username") ?? "");
  const password = String(body.get("password") ?? "");

  if (!validateDemoCredentials(username, password)) {
    return NextResponse.redirect(new URL("/?auth=demo_failed", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);

  response.cookies.set(
    GOOGLE_SESSION_COOKIE,
    encryptSession(createDemoSession()),
    sessionCookieOptions(),
  );

  return response;
}

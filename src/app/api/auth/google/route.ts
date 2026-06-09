import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_PKCE_COOKIE,
  buildGoogleAuthorizationUrl,
  createCodeChallenge,
  createOAuthSecret,
  sessionCookieOptions,
} from "@/server/auth/google";

export function GET(request: NextRequest) {
  try {
    const state = createOAuthSecret();
    const codeVerifier = createOAuthSecret();
    const response = NextResponse.redirect(
      buildGoogleAuthorizationUrl(request, state, createCodeChallenge(codeVerifier)),
    );

    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, sessionCookieOptions(10 * 60));
    response.cookies.set(GOOGLE_PKCE_COOKIE, codeVerifier, sessionCookieOptions(10 * 60));

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Google sign-in could not start" },
      { status: 500 },
    );
  }
}

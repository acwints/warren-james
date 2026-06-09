import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_PKCE_COOKIE,
  GOOGLE_SESSION_COOKIE,
  exchangeGoogleCode,
  fetchGoogleUser,
  encryptSession,
  sessionCookieOptions,
} from "@/server/auth/google";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
    const codeVerifier = request.cookies.get(GOOGLE_PKCE_COOKIE)?.value;

    if (!code || !state || !expectedState || !codeVerifier || state !== expectedState) {
      return NextResponse.redirect(new URL("/?auth=failed", request.url));
    }

    const tokens = await exchangeGoogleCode(request, code, codeVerifier);
    const user = await fetchGoogleUser(tokens);
    const session = encryptSession({
      createdAt: Date.now(),
      tokens,
      user,
    });
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    response.cookies.set(GOOGLE_SESSION_COOKIE, session, sessionCookieOptions());
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", sessionCookieOptions(0));
    response.cookies.set(GOOGLE_PKCE_COOKIE, "", sessionCookieOptions(0));

    return response;
  } catch {
    return NextResponse.redirect(new URL("/?auth=failed", request.url));
  }
}

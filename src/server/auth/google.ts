import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const GOOGLE_SESSION_COOKIE = "wj_google_session";
export const GOOGLE_OAUTH_STATE_COOKIE = "wj_google_oauth_state";
export const GOOGLE_PKCE_COOKIE = "wj_google_pkce";

export const googleOAuthScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/script.projects",
  "https://www.googleapis.com/auth/script.scriptapp",
];

export type GoogleAutomationTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
};

export type GoogleUser = {
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
};

export type GoogleSession = {
  createdAt: number;
  refreshedAt?: number;
  tokens: GoogleAutomationTokens;
  user: GoogleUser;
};

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
};

type GoogleUserInfoResponse = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

const GOOGLE_TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;

export function getBaseUrl(request: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (configuredUrl) {
    return configuredUrl;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

export function getGoogleRedirectUri(request: NextRequest) {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${getBaseUrl(request)}/api/auth/google/callback`;
}

export function buildGoogleAuthorizationUrl(request: NextRequest, state: string, codeChallenge: string) {
  const clientId = requireAuthEnv("GOOGLE_CLIENT_ID");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("access_type", "offline");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("redirect_uri", getGoogleRedirectUri(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleOAuthScopes.join(" "));
  url.searchParams.set("state", state);

  return url;
}

export async function exchangeGoogleCode(request: NextRequest, code: string, codeVerifier: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      client_id: requireAuthEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireAuthEnv("GOOGLE_CLIENT_SECRET"),
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: getGoogleRedirectUri(request),
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed with ${response.status}`);
  }

  const payload = (await response.json()) as GoogleTokenResponse;

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
    refreshToken: payload.refresh_token,
    scope: payload.scope ?? googleOAuthScopes.join(" "),
    tokenType: payload.token_type,
  } satisfies GoogleAutomationTokens;
}

export async function refreshGoogleTokens(tokens: GoogleAutomationTokens) {
  if (!tokens.refreshToken) {
    throw new Error("Google refresh token is missing; sign in again to reconnect automation");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      client_id: requireAuthEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireAuthEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Google token refresh failed with ${response.status}`);
  }

  const payload = (await response.json()) as GoogleTokenResponse;

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
    refreshToken: payload.refresh_token ?? tokens.refreshToken,
    scope: payload.scope ?? tokens.scope,
    tokenType: payload.token_type ?? tokens.tokenType,
  } satisfies GoogleAutomationTokens;
}

export async function fetchGoogleUser(tokens: GoogleAutomationTokens) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      authorization: `${tokens.tokenType} ${tokens.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google userinfo lookup failed with ${response.status}`);
  }

  const payload = (await response.json()) as GoogleUserInfoResponse;

  if (!payload.email) {
    throw new Error("Google did not return an email address for this account");
  }

  return {
    email: payload.email,
    emailVerified: Boolean(payload.email_verified),
    name: payload.name ?? payload.email,
    picture: payload.picture,
  } satisfies GoogleUser;
}

export async function getGoogleSessionFromCookies() {
  const cookieStore = await cookies();
  const value = cookieStore.get(GOOGLE_SESSION_COOKIE)?.value;

  if (!value) {
    return null;
  }

  try {
    return decryptSession(value);
  } catch {
    return null;
  }
}

export async function requireGoogleSession() {
  const session = await getGoogleSessionFromCookies();

  if (!session) {
    return {
      response: NextResponse.json({ error: "Google sign-in required" }, { status: 401 }),
      session: null,
    } as const;
  }

  try {
    const freshSession = await refreshSessionIfNeeded(session);
    return { response: null, session: freshSession } as const;
  } catch (error) {
    return {
      response: NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Google session expired; sign in again to reconnect automation",
        },
        { status: 401 },
      ),
      session: null,
    } as const;
  }
}

export async function refreshSessionIfNeeded(session: GoogleSession) {
  if (session.tokens.expiresAt > Date.now() + GOOGLE_TOKEN_REFRESH_SKEW_MS) {
    return session;
  }

  const refreshedSession = {
    ...session,
    refreshedAt: Date.now(),
    tokens: await refreshGoogleTokens(session.tokens),
  } satisfies GoogleSession;
  const cookieStore = await cookies();

  cookieStore.set(
    GOOGLE_SESSION_COOKIE,
    encryptSession(refreshedSession),
    sessionCookieOptions(),
  );

  return refreshedSession;
}

export function createOAuthSecret() {
  return base64Url(randomBytes(32));
}

export function createCodeChallenge(codeVerifier: string) {
  return base64Url(createHash("sha256").update(codeVerifier).digest());
}

export function encryptSession(session: GoogleSession) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", authKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return base64Url(Buffer.concat([iv, tag, encrypted]));
}

export function decryptSession(value: string) {
  const envelope = Buffer.from(value, "base64url");
  const iv = envelope.subarray(0, 12);
  const tag = envelope.subarray(12, 28);
  const encrypted = envelope.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", authKey(), iv);

  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return JSON.parse(decrypted.toString("utf8")) as GoogleSession;
}

export function sessionCookieOptions(maxAge = 60 * 60 * 24 * 14) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function clearGoogleAuthCookies(response: NextResponse) {
  response.cookies.set(GOOGLE_SESSION_COOKIE, "", sessionCookieOptions(0));
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", sessionCookieOptions(0));
  response.cookies.set(GOOGLE_PKCE_COOKIE, "", sessionCookieOptions(0));
  return response;
}

function requireAuthEnv(name: "AUTH_SECRET" | "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Google authentication`);
  }

  return value;
}

function authKey() {
  return createHash("sha256").update(requireAuthEnv("AUTH_SECRET")).digest();
}

function base64Url(value: Buffer) {
  return value.toString("base64url");
}

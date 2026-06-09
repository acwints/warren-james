import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getSampleCreator } from "@/data/sample-creators";
import {
  buildGoogleAuthorizationUrl,
  createDemoSession,
  createCodeChallenge,
  getGoogleAutomationTokens,
  googleOAuthScopes,
  refreshGoogleTokens,
  validateDemoCredentials,
} from "@/server/auth/google";
import { buildHandoffSections } from "@/domain/templates";
import { createLiveDependencies } from "@/server/integrations/live";

describe("Google auth and automation wiring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("builds a Google OAuth URL with the configured client and automation scopes", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_OAUTH_REDIRECT_URI", "https://app.example.com/api/auth/google/callback");

    const url = buildGoogleAuthorizationUrl(
      new NextRequest("https://app.example.com/api/auth/google"),
      "state-123",
      createCodeChallenge("verifier-123"),
    );

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("client-id.apps.googleusercontent.com");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/auth/google/callback",
    );
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")?.split(" ")).toEqual(googleOAuthScopes);
  });

  it("refreshes expired access tokens while preserving the Google refresh token", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new-access-token",
          expires_in: 3600,
          scope: googleOAuthScopes.join(" "),
          token_type: "Bearer",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tokens = await refreshGoogleTokens({
      accessToken: "old-access-token",
      expiresAt: 1,
      refreshToken: "refresh-token",
      scope: googleOAuthScopes.join(" "),
      tokenType: "Bearer",
    });

    expect(tokens.accessToken).toBe("new-access-token");
    expect(tokens.refreshToken).toBe("refresh-token");
    expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    expect(fetchMock).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uses Google Apps Script and Sheets adapters when live mode has Google tokens", async () => {
    vi.stubEnv("GOOGLE_APPS_SCRIPT_ID", "script-id");
    vi.stubEnv("GOOGLE_HANDOFF_TEMPLATE_ID", "handoff-template");
    vi.stubEnv("GOOGLE_ASSIGNMENT_SHEET_ID", "sheet-id");
    vi.stubEnv("GOOGLE_ASSIGNMENT_SHEET_RANGE", "Assignments!A:I");

    const creator = getSampleCreator();
    const dependencies = createLiveDependencies({
      googleTokens: {
        accessToken: "access-token",
        expiresAt: Date.now() + 3600,
        refreshToken: "refresh-token",
        scope: googleOAuthScopes.join(" "),
        tokenType: "Bearer",
      },
    });
    const handoffDoc = await dependencies.documents.createBizDevHandoff({
      creator,
      dryRun: true,
      sections: buildHandoffSections(creator),
    });
    const assignmentRow = await dependencies.sheets.requestPodAssignment({
      creator,
      dryRun: true,
      handoffDocUrl: handoffDoc.url,
    });

    expect(handoffDoc.metadata.provider).toBe("apps-script-api");
    expect(handoffDoc.metadata.scriptId).toBe("script-id");
    expect(assignmentRow.metadata.provider).toBe("google-sheets-api");
    expect(assignmentRow.url).toBe("https://docs.google.com/spreadsheets/d/sheet-id/edit");
  });

  it("validates demo credentials without exposing Google automation tokens", () => {
    expect(validateDemoCredentials("admin", "wj123!")).toBe(true);
    expect(validateDemoCredentials("admin", "wrong")).toBe(false);
    expect(getGoogleAutomationTokens(createDemoSession())).toBeUndefined();
  });
});

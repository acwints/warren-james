import { afterEach, describe, expect, it, vi } from "vitest";
import { getIntegrationHealth } from "@/server/repositories/integration-store";

describe("getIntegrationHealth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports all product integration surfaces in mock mode", () => {
    const integrations = getIntegrationHealth();

    expect(integrations.map((integration) => integration.key)).toEqual([
      "hubspot",
      "email",
      "google-auth",
      "google-docs",
      "google-sheets",
      "asana",
    ]);
    expect(integrations.every((integration) => integration.status === "mocked")).toBe(true);
  });

  it("treats webhook-worker alternatives as live-ready", () => {
    vi.stubEnv("INTEGRATION_MODE", "live");
    vi.stubEnv("EMAIL_AUTOMATION_WEBHOOK_URL", "https://worker.example/email");
    vi.stubEnv("ASANA_AUTOMATION_WEBHOOK_URL", "https://worker.example/asana");
    vi.stubEnv("ASANA_TEMPLATE_GID", "template-123");

    const integrations = getIntegrationHealth();

    expect(integrations.find((integration) => integration.key === "email")?.status).toBe("ready");
    expect(integrations.find((integration) => integration.key === "asana")?.status).toBe("ready");
  });

  it("treats Google OAuth plus Sheets/App Script settings as live-ready", () => {
    vi.stubEnv("INTEGRATION_MODE", "live");
    vi.stubEnv("AUTH_SECRET", "test-secret");
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    vi.stubEnv("GOOGLE_HANDOFF_TEMPLATE_ID", "handoff-template");
    vi.stubEnv("GOOGLE_APPS_SCRIPT_ID", "script-id");
    vi.stubEnv("GOOGLE_ASSIGNMENT_SHEET_ID", "sheet-id");

    const integrations = getIntegrationHealth();

    expect(integrations.find((integration) => integration.key === "google-auth")?.status).toBe("ready");
    expect(integrations.find((integration) => integration.key === "google-docs")?.status).toBe("ready");
    expect(integrations.find((integration) => integration.key === "google-sheets")?.status).toBe("ready");
  });
});

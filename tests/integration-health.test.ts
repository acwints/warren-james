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
});

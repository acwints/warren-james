import { getAppConfig } from "@/server/config";
import type { IntegrationHealth, IntegrationKey } from "@/domain/integrations";

const integrationDefinitions: Array<{
  key: IntegrationKey;
  label: string;
  purpose: string;
  requiredEnv: string[];
  readyEnvGroups?: string[][];
}> = [
  {
    key: "hubspot",
    label: "HubSpot",
    purpose: "Receives Kickoff stage transitions and creator metadata.",
    requiredEnv: ["HUBSPOT_WEBHOOK_SECRET", "HUBSPOT_PRIVATE_APP_TOKEN"],
    readyEnvGroups: [["HUBSPOT_WEBHOOK_SECRET"], ["HUBSPOT_PRIVATE_APP_TOKEN"]],
  },
  {
    key: "email",
    label: "Executive Email",
    purpose: "Creates or sends the executive kickoff email.",
    requiredEnv: ["RESEND_API_KEY", "EXECUTIVE_EMAIL_FROM", "EXECUTIVE_EMAIL_TO", "EMAIL_AUTOMATION_WEBHOOK_URL"],
    readyEnvGroups: [
      ["RESEND_API_KEY", "EXECUTIVE_EMAIL_FROM", "EXECUTIVE_EMAIL_TO"],
      ["EMAIL_AUTOMATION_WEBHOOK_URL"],
    ],
  },
  {
    key: "google-auth",
    label: "Google OAuth",
    purpose: "Authenticates operators and grants Sheets plus Apps Script automation scopes.",
    requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "AUTH_SECRET", "NEXT_PUBLIC_APP_URL"],
    readyEnvGroups: [["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "AUTH_SECRET"]],
  },
  {
    key: "google-docs",
    label: "Google Docs",
    purpose: "Creates the Biz Dev handoff document through Apps Script or a webhook.",
    requiredEnv: [
      "GOOGLE_APPS_SCRIPT_ID",
      "GOOGLE_APPS_SCRIPT_HANDOFF_FUNCTION",
      "GOOGLE_DOCS_AUTOMATION_WEBHOOK_URL",
      "GOOGLE_HANDOFF_TEMPLATE_ID",
    ],
    readyEnvGroups: [
      ["GOOGLE_APPS_SCRIPT_ID", "GOOGLE_HANDOFF_TEMPLATE_ID"],
      ["GOOGLE_DOCS_AUTOMATION_WEBHOOK_URL", "GOOGLE_HANDOFF_TEMPLATE_ID"],
    ],
  },
  {
    key: "google-sheets",
    label: "Google Sheets",
    purpose: "Writes the pod assignment request and ownership placeholders.",
    requiredEnv: [
      "GOOGLE_ASSIGNMENT_SHEET_ID",
      "GOOGLE_ASSIGNMENT_SHEET_RANGE",
      "GOOGLE_SHEETS_AUTOMATION_WEBHOOK_URL",
    ],
    readyEnvGroups: [
      ["GOOGLE_ASSIGNMENT_SHEET_ID"],
      ["GOOGLE_SHEETS_AUTOMATION_WEBHOOK_URL", "GOOGLE_ASSIGNMENT_SHEET_ID"],
    ],
  },
  {
    key: "asana",
    label: "Asana",
    purpose: "Creates the launch project from the Warren James template.",
    requiredEnv: ["ASANA_ACCESS_TOKEN", "ASANA_WORKSPACE_GID", "ASANA_TEAM_GID", "ASANA_TEMPLATE_GID", "ASANA_AUTOMATION_WEBHOOK_URL"],
    readyEnvGroups: [
      ["ASANA_ACCESS_TOKEN", "ASANA_WORKSPACE_GID", "ASANA_TEAM_GID", "ASANA_TEMPLATE_GID"],
      ["ASANA_AUTOMATION_WEBHOOK_URL", "ASANA_TEMPLATE_GID"],
    ],
  },
];

export function getIntegrationHealth(): IntegrationHealth[] {
  const config = getAppConfig();
  const now = new Date().toISOString();

  return integrationDefinitions.map((definition) => {
    const configuredEnv = definition.requiredEnv.filter((name) => Boolean(process.env[name]));
    const liveReady = (definition.readyEnvGroups ?? [definition.requiredEnv]).some((group) =>
      group.every((name) => Boolean(process.env[name])),
    );

    return {
      key: definition.key,
      label: definition.label,
      mode: config.integrationMode,
      status:
        config.integrationMode === "mock"
          ? "mocked"
          : liveReady
            ? "ready"
            : "misconfigured",
      requiredEnv: definition.requiredEnv,
      configuredEnv,
      lastCheckedAt: now,
      purpose: definition.purpose,
    };
  });
}

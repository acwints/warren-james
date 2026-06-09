export type IntegrationKey = "hubspot" | "email" | "google-docs" | "google-sheets" | "asana";

export type IntegrationMode = "mock" | "live";

export type IntegrationStatus = "ready" | "mocked" | "misconfigured";

export type IntegrationHealth = {
  key: IntegrationKey;
  label: string;
  mode: IntegrationMode;
  status: IntegrationStatus;
  requiredEnv: string[];
  configuredEnv: string[];
  lastCheckedAt: string;
  purpose: string;
};

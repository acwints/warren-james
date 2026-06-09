export type AppConfig = {
  integrationMode: "mock" | "live";
  hubspotWebhookSecret?: string;
  googleHandoffTemplateId: string;
  googleAssignmentSheetId: string;
  asanaTemplateGid: string;
};

export function getAppConfig(): AppConfig {
  return {
    integrationMode: process.env.INTEGRATION_MODE === "live" ? "live" : "mock",
    hubspotWebhookSecret: process.env.HUBSPOT_WEBHOOK_SECRET,
    googleHandoffTemplateId:
      process.env.GOOGLE_HANDOFF_TEMPLATE_ID ?? "1184tV84uxZc_jb6ihlz62wr0c4IqO-lT",
    googleAssignmentSheetId:
      process.env.GOOGLE_ASSIGNMENT_SHEET_ID ?? "17zG19AVIVZn4F4nDV2IclzCROml1_gNC9m9pmn-BIyQ",
    asanaTemplateGid: process.env.ASANA_TEMPLATE_GID ?? "1210851077487060",
  };
}

export type AppConfig = {
  integrationMode: "mock" | "live";
  hubspotWebhookSecret?: string;
  googleAppsScriptHandoffFunction: string;
  googleAppsScriptId?: string;
  googleHandoffTemplateId: string;
  googleAssignmentSheetId: string;
  googleAssignmentSheetRange: string;
  asanaTemplateGid: string;
};

export function getAppConfig(): AppConfig {
  return {
    integrationMode: process.env.INTEGRATION_MODE === "live" ? "live" : "mock",
    hubspotWebhookSecret: process.env.HUBSPOT_WEBHOOK_SECRET,
    googleAppsScriptHandoffFunction:
      process.env.GOOGLE_APPS_SCRIPT_HANDOFF_FUNCTION ?? "createBizDevHandoff",
    googleAppsScriptId: process.env.GOOGLE_APPS_SCRIPT_ID,
    googleHandoffTemplateId:
      process.env.GOOGLE_HANDOFF_TEMPLATE_ID ?? "1184tV84uxZc_jb6ihlz62wr0c4IqO-lT",
    googleAssignmentSheetId:
      process.env.GOOGLE_ASSIGNMENT_SHEET_ID ?? "17zG19AVIVZn4F4nDV2IclzCROml1_gNC9m9pmn-BIyQ",
    googleAssignmentSheetRange: process.env.GOOGLE_ASSIGNMENT_SHEET_RANGE ?? "Assignments!A:I",
    asanaTemplateGid: process.env.ASANA_TEMPLATE_GID ?? "1210851077487060",
  };
}

import type {
  AsanaProjectInput,
  AuditGateway,
  DocumentsGateway,
  EmailGateway,
  ExecutiveEmailInput,
  HandoffDocInput,
  KickoffDependencies,
  PodAssignmentInput,
  ProjectGateway,
  SheetsGateway,
} from "@/server/ports";
import type { WorkflowArtifact } from "@/domain/workflow";
import type { DependencyOptions } from "@/server/integrations";
import type { GoogleAutomationTokens } from "@/server/auth/google";
import { getAppConfig } from "@/server/config";
import { createAsanaProjectFromTemplate } from "@/server/integrations/asana-client";
import { providerFetch } from "@/server/integrations/http";
import { sendExecutiveEmailWithResend } from "@/server/integrations/resend-client";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required when INTEGRATION_MODE=live`);
  }

  return value;
}

class WebhookEmailGateway implements EmailGateway {
  async sendExecutiveEmail(input: ExecutiveEmailInput): Promise<WorkflowArtifact> {
    const resendResult = await sendExecutiveEmailWithResend(input);

    if (resendResult) {
      return {
        id: resendResult.id ?? `email_${crypto.randomUUID()}`,
        kind: "email",
        label: input.dryRun ? "Executive email draft" : "Executive email sent",
        metadata: {
          provider: "resend",
          subject: input.subject,
          recipientGroup: "Executive Team",
          mode: input.dryRun ? "draft" : "sent",
        },
      };
    }

    const endpoint = requireEnv("EMAIL_AUTOMATION_WEBHOOK_URL");
    const response = await fetch(endpoint, {
      body: JSON.stringify(input),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Email automation failed with ${response.status}`);
    }

    const payload = (await response.json()) as { id?: string; url?: string };

    return {
      id: payload.id ?? `email_${crypto.randomUUID()}`,
      kind: "email",
      label: input.dryRun ? "Executive email draft" : "Executive email sent",
      url: payload.url,
      metadata: {
        subject: input.subject,
        recipientGroup: "Executive Team",
        mode: input.dryRun ? "draft" : "sent",
      },
    };
  }
}

function googleAuthHeaders(tokens: GoogleAutomationTokens) {
  return {
    authorization: `${tokens.tokenType} ${tokens.accessToken}`,
  };
}

class GoogleDocsGateway implements DocumentsGateway {
  constructor(private readonly tokens?: GoogleAutomationTokens) {}

  async createBizDevHandoff(input: HandoffDocInput): Promise<WorkflowArtifact> {
    const config = getAppConfig();

    if (this.tokens && config.googleAppsScriptId) {
      if (input.dryRun) {
        return {
          id: `gdoc_dry_${crypto.randomUUID()}`,
          kind: "document",
          label: "Biz Dev handoff doc draft",
          metadata: {
            provider: "apps-script-api",
            scriptId: config.googleAppsScriptId,
            template: config.googleHandoffTemplateId,
            sectionCount: input.sections.length,
            mode: "dry-run",
          },
        };
      }

      const response = await providerFetch(
        "google-apps-script",
        `https://script.googleapis.com/v1/scripts/${config.googleAppsScriptId}:run`,
        {
          body: JSON.stringify({
            function: config.googleAppsScriptHandoffFunction,
            parameters: [
              {
                creator: input.creator,
                dryRun: input.dryRun,
                sections: input.sections,
                templateId: config.googleHandoffTemplateId,
              },
            ],
          }),
          headers: googleAuthHeaders(this.tokens),
          method: "POST",
        },
      );
      const payload = (await response.json()) as {
        response?: { result?: { id?: string; url?: string } };
        error?: { message?: string };
      };

      if (payload.error) {
        throw new Error(payload.error.message ?? "Apps Script handoff automation failed");
      }

      const result = payload.response?.result;

      return {
        id: result?.id ?? `gdoc_${crypto.randomUUID()}`,
        kind: "document",
        label: "Biz Dev handoff doc",
        url: result?.url,
        metadata: {
          provider: "apps-script-api",
          scriptId: config.googleAppsScriptId,
          template: config.googleHandoffTemplateId,
          sectionCount: input.sections.length,
        },
      };
    }

    const endpoint = requireEnv("GOOGLE_DOCS_AUTOMATION_WEBHOOK_URL");
    const response = await fetch(endpoint, {
      body: JSON.stringify(input),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Google Docs automation failed with ${response.status}`);
    }

    const payload = (await response.json()) as { id?: string; url?: string };

    return {
      id: payload.id ?? `gdoc_${crypto.randomUUID()}`,
      kind: "document",
      label: "Biz Dev handoff doc",
      url: payload.url,
      metadata: {
        provider: "webhook",
        template: config.googleHandoffTemplateId,
        sectionCount: input.sections.length,
      },
    };
  }
}

class GoogleSheetsGateway implements SheetsGateway {
  constructor(private readonly tokens?: GoogleAutomationTokens) {}

  async requestPodAssignment(input: PodAssignmentInput): Promise<WorkflowArtifact> {
    const config = getAppConfig();

    if (this.tokens && config.googleAssignmentSheetId) {
      const values = [
        [
          new Date().toISOString(),
          input.creator.id,
          input.creator.name,
          input.creator.handle,
          input.creator.priority,
          input.creator.businessDevelopmentOwner,
          input.creator.targetLaunchDate,
          input.handoffDocUrl ?? "",
          input.dryRun ? "dry-run" : "needs-leadership-assignment",
        ],
      ];
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${config.googleAssignmentSheetId}/edit`;

      if (!input.dryRun) {
        await providerFetch(
          "google-sheets",
          `https://sheets.googleapis.com/v4/spreadsheets/${config.googleAssignmentSheetId}/values/${encodeURIComponent(
            config.googleAssignmentSheetRange,
          )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
          {
            body: JSON.stringify({ values }),
            headers: googleAuthHeaders(this.tokens),
            method: "POST",
          },
        );
      }

      return {
        id: `sheetrow_${crypto.randomUUID()}`,
        kind: "sheet-row",
        label: input.dryRun ? "Pod assignment row draft" : "Pod assignment requested",
        url: sheetUrl,
        metadata: {
          provider: "google-sheets-api",
          range: config.googleAssignmentSheetRange,
          status: input.dryRun ? "Dry run only" : "Needs leadership assignment",
          priority: input.creator.priority,
          handoffDocLinked: Boolean(input.handoffDocUrl),
        },
      };
    }

    const endpoint = requireEnv("GOOGLE_SHEETS_AUTOMATION_WEBHOOK_URL");
    const response = await fetch(endpoint, {
      body: JSON.stringify(input),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Google Sheets automation failed with ${response.status}`);
    }

    const payload = (await response.json()) as { id?: string; url?: string };

    return {
      id: payload.id ?? `sheetrow_${crypto.randomUUID()}`,
      kind: "sheet-row",
      label: "Pod assignment requested",
      url: payload.url,
      metadata: {
        provider: "webhook",
        status: "Needs leadership assignment",
        priority: input.creator.priority,
      },
    };
  }
}

class AsanaGateway implements ProjectGateway {
  async createLaunchProject(input: AsanaProjectInput): Promise<WorkflowArtifact> {
    const project = await createAsanaProjectFromTemplate(input);

    if (project) {
      return {
        id: project.data?.gid ?? `asana_${crypto.randomUUID()}`,
        kind: "asana-project",
        label: project.data?.name ?? "Asana launch project",
        url: project.data?.permalink_url,
        metadata: {
          provider: "asana-api",
          templateGid: process.env.ASANA_TEMPLATE_GID ?? "configured-template",
          targetLaunchDate: input.creator.targetLaunchDate,
        },
      };
    }

    const endpoint = requireEnv("ASANA_AUTOMATION_WEBHOOK_URL");
    const response = await fetch(endpoint, {
      body: JSON.stringify(input),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Asana automation failed with ${response.status}`);
    }

    const payload = (await response.json()) as { id?: string; url?: string };

    return {
      id: payload.id ?? `asana_${crypto.randomUUID()}`,
      kind: "asana-project",
      label: "Asana launch project",
      url: payload.url,
      metadata: {
        templateGid: process.env.ASANA_TEMPLATE_GID ?? "configured-template",
        targetLaunchDate: input.creator.targetLaunchDate,
      },
    };
  }
}

class ConsoleAuditGateway implements AuditGateway {
  async record(action: string, detail: string) {
    console.info(`[audit] ${action}: ${detail}`);
  }
}

export function createLiveDependencies(options: DependencyOptions = {}): KickoffDependencies {
  return {
    email: new WebhookEmailGateway(),
    documents: new GoogleDocsGateway(options.googleTokens),
    sheets: new GoogleSheetsGateway(options.googleTokens),
    projects: new AsanaGateway(),
    audit: new ConsoleAuditGateway(),
  };
}

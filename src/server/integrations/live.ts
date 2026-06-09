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
import { createAsanaProjectFromTemplate } from "@/server/integrations/asana-client";
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

class GoogleDocsGateway implements DocumentsGateway {
  async createBizDevHandoff(input: HandoffDocInput): Promise<WorkflowArtifact> {
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
        template: process.env.GOOGLE_HANDOFF_TEMPLATE_ID ?? "configured-template",
        sectionCount: input.sections.length,
      },
    };
  }
}

class GoogleSheetsGateway implements SheetsGateway {
  async requestPodAssignment(input: PodAssignmentInput): Promise<WorkflowArtifact> {
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

export function createLiveDependencies(): KickoffDependencies {
  return {
    email: new WebhookEmailGateway(),
    documents: new GoogleDocsGateway(),
    sheets: new GoogleSheetsGateway(),
    projects: new AsanaGateway(),
    audit: new ConsoleAuditGateway(),
  };
}

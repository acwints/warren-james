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

function artifactId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

class MockEmailGateway implements EmailGateway {
  async sendExecutiveEmail(input: ExecutiveEmailInput) {
    await wait();

    return {
      id: artifactId("email"),
      kind: "email",
      label: input.dryRun ? "Executive email draft" : "Executive email sent",
      url: `mailto:exec-team@warrenjames.org?subject=${encodeURIComponent(input.subject)}`,
      metadata: {
        subject: input.subject,
        preview: input.preview,
        recipientGroup: "Executive Team",
        mode: input.dryRun ? "draft" : "sent",
      },
    } as const;
  }
}

class MockDocumentsGateway implements DocumentsGateway {
  async createBizDevHandoff(input: HandoffDocInput) {
    await wait();

    return {
      id: artifactId("gdoc"),
      kind: "document",
      label: "Biz Dev handoff doc",
      url: `https://docs.google.com/document/d/mock-${input.creator.id}/edit`,
      metadata: {
        template: "Biz Dev handoff",
        sectionCount: input.sections.length,
        creator: input.creator.name,
      },
    } as const;
  }
}

class MockSheetsGateway implements SheetsGateway {
  async requestPodAssignment(input: PodAssignmentInput) {
    await wait();

    return {
      id: artifactId("sheetrow"),
      kind: "sheet-row",
      label: "Pod assignment requested",
      url: "https://docs.google.com/spreadsheets/d/17zG19AVIVZn4F4nDV2IclzCROml1_gNC9m9pmn-BIyQ/edit#gid=0",
      metadata: {
        status: "Needs leadership assignment",
        priority: input.creator.priority,
        handoffDocLinked: Boolean(input.handoffDocUrl),
      },
    } as const;
  }
}

class MockProjectGateway implements ProjectGateway {
  async createLaunchProject(input: AsanaProjectInput) {
    await wait();

    return {
      id: artifactId("asana"),
      kind: "asana-project",
      label: "Asana launch project",
      url: `https://app.asana.com/0/mock-${input.creator.id}/list`,
      metadata: {
        templateGid: "1210851077487060",
        targetLaunchDate: input.creator.targetLaunchDate,
        handoffDocLinked: Boolean(input.handoffDocUrl),
        podAssignmentLinked: Boolean(input.podAssignmentUrl),
      },
    } as const;
  }
}

class MemoryAuditGateway implements AuditGateway {
  readonly events: Array<{ action: string; detail: string }> = [];

  async record(action: string, detail: string) {
    this.events.push({ action, detail });
  }
}

export function createMockDependencies(): KickoffDependencies {
  return {
    email: new MockEmailGateway(),
    documents: new MockDocumentsGateway(),
    sheets: new MockSheetsGateway(),
    projects: new MockProjectGateway(),
    audit: new MemoryAuditGateway(),
  };
}

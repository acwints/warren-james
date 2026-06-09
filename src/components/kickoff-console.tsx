"use client";

import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Database,
  FileText,
  Gauge,
  GitBranch,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plug,
  RefreshCw,
  Rows3,
  ShieldCheck,
  SquareKanban,
  Timer,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import type { CreatorProfile } from "@/domain/creator";
import type { IntegrationHealth } from "@/domain/integrations";
import type {
  ReviewItem,
  SourceEvent,
  WorkflowArtifact,
  WorkflowRun,
  WorkflowStep,
} from "@/domain/workflow";
import type { GoogleUser } from "@/server/auth/google";

type DashboardMetrics = {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  openReviewItems: number;
  sourceEvents: number;
  duplicateEvents: number;
  artifactsCreated: number;
  automationCoverage: number;
};

type ReviewQueueItem = ReviewItem & {
  creatorName: string;
  runId: string;
};

type DashboardState = {
  generatedAt: string;
  metrics: DashboardMetrics;
  runs: WorkflowRun[];
  sourceEvents: SourceEvent[];
  openReviewItems: ReviewQueueItem[];
  integrations: IntegrationHealth[];
};

type KickoffConsoleProps = {
  creators: CreatorProfile[];
  initialDashboard: DashboardState;
  operator?: GoogleUser;
};

type TabKey = "overview" | "review" | "runs" | "events" | "artifacts" | "integrations";

const tabs: Array<{ key: TabKey; label: string; icon: typeof Gauge }> = [
  { key: "overview", label: "Overview", icon: Gauge },
  { key: "review", label: "Review", icon: ClipboardCheck },
  { key: "runs", label: "Runs", icon: Workflow },
  { key: "events", label: "Events", icon: GitBranch },
  { key: "artifacts", label: "Artifacts", icon: Database },
  { key: "integrations", label: "Integrations", icon: Plug },
];

const stepIcons = {
  "asana-project": SquareKanban,
  "biz-dev-handoff": FileText,
  "executive-email": Mail,
  "pod-assignment": Rows3,
} as const;

export function KickoffConsole({ creators, initialDashboard, operator }: KickoffConsoleProps) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState(creators[0]?.id ?? "");
  const [selectedRunId, setSelectedRunId] = useState(initialDashboard.runs[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCreator =
    creators.find((creator) => creator.id === selectedCreatorId) ?? creators[0];
  const selectedRun =
    dashboard.runs.find((run) => run.id === selectedRunId) ?? dashboard.runs[0];
  const activeSection = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const artifacts = useMemo(
    () => dashboard.runs.flatMap((run) => run.artifacts.map((artifact) => ({ ...artifact, run }))),
    [dashboard.runs],
  );

  function runDemo() {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/demo/run", {
        body: JSON.stringify({ creatorId: selectedCreator.id, dryRun: true }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      const payload = (await response.json()) as { run?: WorkflowRun; error?: string };

      if (!response.ok || !payload.run) {
        setError(payload.error ?? "Kickoff automation failed");
        return;
      }

      const nextDashboard = await fetchDashboard();
      setDashboard(nextDashboard);
      setSelectedRunId(payload.run.id);
      setActiveTab("overview");
    });
  }

  async function changeReviewStatus(runId: string, itemId: string, status: ReviewItem["status"]) {
    setError(null);
    const response = await fetch(`/api/runs/${runId}/review`, {
      body: JSON.stringify({ itemId, status }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });

    if (!response.ok) {
      setError("Could not update review item");
      return;
    }

    setDashboard(await fetchDashboard());
  }

  function retryRun(runId: string) {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/runs/${runId}/retry`, {
        method: "POST",
      });

      const payload = (await response.json()) as { run?: WorkflowRun; error?: string };

      if (!response.ok || !payload.run) {
        setError(payload.error ?? "Retry failed");
        return;
      }

      setDashboard(await fetchDashboard());
      setSelectedRunId(payload.run.id);
      setActiveTab("overview");
    });
  }

  const shellOffsetClass = sidebarCollapsed ? "lg:pl-[84px]" : "lg:pl-[288px]";

  return (
    <main className="wj-brand-grid min-h-screen bg-[var(--wj-white)] text-[var(--wj-black)]">
      <aside
        className={`border-b border-black bg-black text-[var(--wj-white)] transition-all duration-200 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r ${
          sidebarCollapsed ? "lg:w-[84px]" : "lg:w-[288px]"
        }`}
      >
        <div
          className={`flex min-h-16 items-center border-b border-[rgba(244,244,244,0.18)] px-4 ${
            sidebarCollapsed ? "lg:justify-center" : ""
          }`}
        >
          <BrandBlock collapsed={sidebarCollapsed} />
        </div>

        <div className="flex gap-4 overflow-x-auto px-4 py-4 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto">
          <nav className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col" aria-label="Primary navigation">
            <button
              aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
              className="hidden h-11 w-full items-center justify-center rounded border border-transparent px-2 text-[rgba(244,244,244,0.68)] transition hover:border-[rgba(244,244,244,0.24)] hover:bg-[rgba(244,244,244,0.08)] hover:text-white lg:flex"
              onClick={() => setSidebarCollapsed((value) => !value)}
              title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
              type="button"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="size-4 shrink-0" /> : <PanelLeftClose className="size-4 shrink-0" />}
            </button>

            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;

              return (
                <button
                  className={`flex h-11 items-center gap-3 rounded px-3 text-sm font-extrabold transition ${
                    active
                      ? "border border-white bg-[var(--wj-white)] text-black"
                      : "border border-transparent text-[rgba(244,244,244,0.68)] hover:border-[rgba(244,244,244,0.24)] hover:bg-[rgba(244,244,244,0.08)] hover:text-white"
                  } ${sidebarCollapsed ? "lg:justify-center lg:px-2" : ""}`}
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  title={sidebarCollapsed ? tab.label : undefined}
                  type="button"
                >
                  <Icon className="size-4 shrink-0" />
                  <span className={`${sidebarCollapsed ? "lg:hidden" : ""}`}>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className={`min-h-screen transition-[padding] duration-200 ${shellOffsetClass}`}>
        <header className="sticky top-0 z-30 border-b border-black bg-[rgba(244,244,244,0.94)] backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <Image
                alt="Warren James"
                className="hidden size-10 shrink-0 rounded border border-black object-contain sm:block"
                height={40}
                priority
                src="/brand/warren-james-black-logo.png"
                width={40}
              />
              <div className="min-w-0">
                <p className="wj-label">Warren James internal ops</p>
                <h1 className="truncate text-xl font-extrabold tracking-normal sm:text-2xl">
                  {activeSection.label}
                </h1>
              </div>
            </div>
            <div className="hidden min-w-0 flex-1 justify-center px-4 xl:flex">
              <p className="max-w-2xl truncate text-sm text-[rgba(0,0,0,0.62)]">
                Creator kickoff auto-spinup · intake, artifacts, assignment, and launch readiness
              </p>
            </div>
            {operator ? (
              <div className="hidden min-w-0 text-right md:block">
                <p className="wj-label">Signed in</p>
                <p className="mt-1 max-w-44 truncate text-xs font-semibold">{operator.email}</p>
              </div>
            ) : null}
            <button
              className="wj-button-primary shrink-0"
              disabled={isPending || !selectedCreator}
              onClick={runDemo}
              type="button"
            >
              {isPending ? <RefreshCw className="size-4 animate-spin" /> : <Play className="size-4" />}
              Run kickoff
            </button>
          </div>
        </header>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <div className="border-b border-black pb-5">
            <p className="wj-label">{activeSection.label}</p>
            <h2 className="mt-2 max-w-5xl text-4xl font-extrabold leading-[0.95] tracking-normal sm:text-6xl">
              Creator kickoff auto-spinup
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[rgba(0,0,0,0.64)]">
              Building the operational layer behind creator-led brands from one command surface.
            </p>
          </div>

          <KickoffContextPanel
            creators={creators}
            selectedCreatorId={selectedCreatorId}
            creator={selectedCreator}
            onSelect={setSelectedCreatorId}
          />

          {error ? (
            <div className="mt-4 flex items-center gap-2 rounded border border-[var(--wj-red)] bg-white px-4 py-3 text-sm font-semibold text-[var(--wj-red)]">
              <AlertCircle className="size-4" />
              {error}
            </div>
          ) : null}

          <div className="py-5">
            {activeTab === "overview" ? (
              <OverviewTab
                metrics={dashboard.metrics}
                run={selectedRun}
                creator={selectedCreator}
                reviewItems={dashboard.openReviewItems}
              />
            ) : null}
            {activeTab === "review" ? (
              <ReviewTab items={dashboard.openReviewItems} onChangeStatus={changeReviewStatus} />
            ) : null}
            {activeTab === "runs" ? (
              <RunsTab
                runs={dashboard.runs}
                selectedRun={selectedRun}
                onRetryRun={retryRun}
                onSelectRun={(runId) => {
                  setSelectedRunId(runId);
                  setActiveTab("overview");
                }}
              />
            ) : null}
            {activeTab === "events" ? <EventsTab events={dashboard.sourceEvents} /> : null}
            {activeTab === "artifacts" ? <ArtifactsTab artifacts={artifacts} /> : null}
            {activeTab === "integrations" ? (
              <IntegrationsTab integrations={dashboard.integrations} generatedAt={dashboard.generatedAt} />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandBlock({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        alt="Warren James"
        className="size-11 rounded border border-[rgba(244,244,244,0.32)] object-contain"
        height={44}
        priority
        src="/brand/warren-james-white-logo.png"
        width={44}
      />
      <div className={collapsed ? "hidden" : ""}>
        <p className="text-sm font-extrabold uppercase tracking-[0.18em]">Launch Ops</p>
        <p className="mt-1 text-xs text-[rgba(244,244,244,0.58)]">Creator brand infrastructure</p>
      </div>
    </div>
  );
}

function KickoffContextPanel({
  creators,
  selectedCreatorId,
  creator,
  onSelect,
}: {
  creators: CreatorProfile[];
  selectedCreatorId: string;
  creator?: CreatorProfile;
  onSelect: (creatorId: string) => void;
}) {
  const capabilities = [
    "Custom design",
    "Product development",
    "E-commerce",
    "Fulfillment",
    "Marketing",
    "Special events",
  ];

  return (
    <section className="wj-card mt-5 overflow-hidden">
      <div className="wj-card-header">
        <div>
          <p className="wj-label">Kickoff context</p>
          <h2 className="mt-1 text-sm font-semibold">Active creator and launch signal</h2>
        </div>
        <span className="rounded-full border border-black bg-[var(--wj-white)] px-2 py-1 text-xs font-extrabold uppercase">
          {creator?.priority ?? "unscored"}
        </span>
      </div>
      <div className="grid gap-px bg-[var(--wj-line)] lg:grid-cols-[minmax(260px,0.9fr)_minmax(260px,0.8fr)_minmax(320px,1fr)]">
        <div className="bg-white p-4">
          <p className="wj-label">Creator queue</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {creators.map((item) => (
              <button
                className={`rounded border px-3 py-3 text-left transition ${
                  item.id === selectedCreatorId
                    ? "border-black bg-black text-[var(--wj-white)]"
                    : "border-[var(--wj-line)] bg-[var(--wj-white)] hover:border-black hover:bg-white"
                }`}
                key={item.id}
                onClick={() => onSelect(item.id)}
                type="button"
              >
                <span className="block text-sm font-extrabold">{item.name}</span>
                <span
                  className={`mt-1 block text-xs ${
                    item.id === selectedCreatorId ? "text-[rgba(244,244,244,0.64)]" : "text-[rgba(0,0,0,0.58)]"
                  }`}
                >
                  {item.category}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4">
          <p className="wj-label">Current trigger</p>
          <p className="mt-3 text-sm font-semibold">HubSpot stage changed to Kickoff</p>
          <p className="mt-2 text-xs leading-5 text-[rgba(0,0,0,0.6)]">
            {creator?.businessDevelopmentOwner ?? "Unassigned"} owns the handoff for{" "}
            {creator?.targetLaunchDate ?? "the target launch window"}.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <InfoPill label="Reach" value={creator ? creator.estimatedReach.toLocaleString() : "Missing"} />
            <InfoPill label="Value" value={creator ? `$${creator.opportunityValue.toLocaleString()}` : "Missing"} />
          </div>
        </div>

        <div className="bg-white p-4">
          <p className="wj-label">Capabilities</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {capabilities.map((capability) => (
              <span
                className="rounded-full border border-[var(--wj-line)] bg-[var(--wj-white)] px-3 py-2 text-xs font-extrabold uppercase leading-none tracking-[0.08em]"
                key={capability}
              >
                {capability}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function OverviewTab({
  metrics,
  run,
  creator,
  reviewItems,
}: {
  metrics: DashboardMetrics;
  run?: WorkflowRun;
  creator?: CreatorProfile;
  reviewItems: ReviewQueueItem[];
}) {
  const completedSteps = run?.steps.filter((step) => step.status === "completed").length ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Runs completed" value={metrics.completedRuns.toString()} tone="green" />
        <Metric label="Automation" value={`${metrics.automationCoverage}%`} tone="amber" />
        <Metric label="Open reviews" value={metrics.openReviewItems.toString()} tone="coral" />
        <Metric label="Events" value={metrics.sourceEvents.toString()} tone="ink" />
        <Metric label="Duplicates" value={metrics.duplicateEvents.toString()} tone="amber" />
        <Metric label="Steps" value={`${completedSteps}/4`} tone="green" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <section className="space-y-5">
          <AutomationPath run={run} />
          <CreatorContext creator={creator} />
        </section>
        <section className="space-y-5">
          <ReadinessCard run={run} />
          <NextActionsCard run={run} />
          <ReviewPreview items={reviewItems} />
        </section>
      </div>
    </div>
  );
}

function ReviewTab({
  items,
  onChangeStatus,
}: {
  items: ReviewQueueItem[];
  onChangeStatus: (runId: string, itemId: string, status: ReviewItem["status"]) => void;
}) {
  return (
    <div className="wj-card">
      <div className="wj-card-header">
        <h2 className="text-sm font-semibold">Human review queue</h2>
        <span className="text-xs text-[rgba(0,0,0,0.58)]">{items.length} open items</span>
      </div>
      <div className="divide-y divide-[var(--wj-line)]">
        {items.length > 0 ? (
          items.map((item) => (
            <div className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_160px_160px_auto]" key={item.id}>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-[rgba(0,0,0,0.58)]">
                  {item.creatorName} · {item.detail}
                </p>
              </div>
              <InfoPill label="Owner" value={item.owner} />
              <InfoPill label="Due" value={new Date(item.dueAt).toLocaleDateString()} />
              <div className="flex items-center gap-2">
                <StatusPill status={item.status} />
                <button
                  className="wj-action-secondary"
                  onClick={() => onChangeStatus(item.runId, item.id, "approved")}
                  type="button"
                >
                  Approve
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState text="No review items are open." />
        )}
      </div>
    </div>
  );
}

function RunsTab({
  runs,
  selectedRun,
  onRetryRun,
  onSelectRun,
}: {
  runs: WorkflowRun[];
  selectedRun?: WorkflowRun;
  onRetryRun: (runId: string) => void;
  onSelectRun: (runId: string) => void;
}) {
  return (
    <div className="wj-card">
      <div className="wj-card-header">
        <h2 className="text-sm font-semibold">Run history</h2>
        <span className="text-xs text-[rgba(0,0,0,0.58)]">{runs.length} runs</span>
      </div>
      <div className="divide-y divide-[var(--wj-line)]">
        {runs.length > 0 ? (
          runs.map((run) => (
            <div
              className={`grid gap-3 px-4 py-4 text-left transition lg:grid-cols-[1fr_160px_160px_110px_140px] ${
                run.id === selectedRun?.id ? "bg-black text-[var(--wj-white)]" : "hover:bg-white"
              }`}
              key={run.id}
            >
              <button className="text-left" onClick={() => onSelectRun(run.id)} type="button">
                <p className="text-sm font-semibold">{run.creatorName}</p>
                <p className={`mt-1 font-mono text-xs ${run.id === selectedRun?.id ? "text-[rgba(244,244,244,0.62)]" : "text-[rgba(0,0,0,0.58)]"}`}>
                  {run.id}
                </p>
                <p className={`mt-1 text-xs ${run.id === selectedRun?.id ? "text-[rgba(244,244,244,0.62)]" : "text-[rgba(0,0,0,0.58)]"}`}>
                  {run.workflowTemplateVersion} · attempt {run.attempt}
                </p>
              </button>
              <InfoPill label="Started" value={new Date(run.startedAt).toLocaleString()} />
              <InfoPill label="Source" value={run.source} />
              <StatusPill status={run.status} />
              <button
                className={`wj-action-secondary ${run.id === selectedRun?.id ? "border-[rgba(244,244,244,0.36)] hover:bg-[var(--wj-white)] hover:text-black" : ""}`}
                onClick={() => onRetryRun(run.id)}
                type="button"
              >
                Retry run
              </button>
            </div>
          ))
        ) : (
          <EmptyState text="No kickoff runs yet." />
        )}
      </div>
    </div>
  );
}

function EventsTab({ events }: { events: SourceEvent[] }) {
  return (
    <div className="wj-card">
      <div className="wj-card-header">
        <h2 className="text-sm font-semibold">Source events</h2>
        <span className="text-xs text-[rgba(0,0,0,0.58)]">{events.length} events</span>
      </div>
      <div className="divide-y divide-[var(--wj-line)]">
        {events.length > 0 ? (
          events.map((event) => (
            <div className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_130px_150px_1fr]" key={event.id}>
              <div>
                <p className="text-sm font-semibold">{event.eventType}</p>
                <p className="mt-1 font-mono text-xs text-[rgba(0,0,0,0.58)]">{event.id}</p>
                <p className="mt-1 text-xs text-[rgba(0,0,0,0.58)]">{event.rawSummary}</p>
                {(event.duplicateDeliveries ?? 0) > 0 ? (
                  <p className="mt-1 text-xs font-semibold text-[var(--wj-amber)]">
                    {event.duplicateDeliveries} duplicate delivery
                    {event.duplicateDeliveries === 1 ? "" : "ies"} suppressed
                  </p>
                ) : null}
              </div>
              <StatusPill status={event.status} />
              <InfoPill label="Provider" value={event.provider} />
              <div>
                <p className="wj-label">Fingerprint</p>
                <p className="mt-1 break-all font-mono text-xs text-[rgba(0,0,0,0.72)]">
                  {event.fingerprint.slice(0, 24)}
                </p>
                {event.relatedRunId ? (
                  <p className="mt-1 font-mono text-xs text-[rgba(0,0,0,0.58)]">{event.relatedRunId}</p>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <EmptyState text="No source events have been received." />
        )}
      </div>
    </div>
  );
}

function ArtifactsTab({ artifacts }: { artifacts: Array<WorkflowArtifact & { run: WorkflowRun }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {artifacts.length > 0 ? (
        artifacts.map((artifact) => <ArtifactLink artifact={artifact} key={`${artifact.run.id}-${artifact.id}`} />)
      ) : (
        <div className="wj-card p-8 text-sm text-[rgba(0,0,0,0.58)]">Run the kickoff flow to create artifacts.</div>
      )}
    </div>
  );
}

function IntegrationsTab({
  integrations,
  generatedAt,
}: {
  integrations: IntegrationHealth[];
  generatedAt: string;
}) {
  return (
    <div className="wj-card">
      <div className="wj-card-header">
        <h2 className="text-sm font-semibold">Integration readiness</h2>
        <span className="text-xs text-[rgba(0,0,0,0.58)]">Checked {new Date(generatedAt).toLocaleTimeString()}</span>
      </div>
      <div className="divide-y divide-[var(--wj-line)]">
        {integrations.map((integration) => (
          <div className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_120px_140px_1fr]" key={integration.key}>
            <div>
              <p className="text-sm font-semibold">{integration.label}</p>
              <p className="mt-1 text-xs text-[rgba(0,0,0,0.58)]">{integration.purpose}</p>
            </div>
            <StatusPill status={integration.status} />
            <InfoPill label="Mode" value={integration.mode} />
            <div>
              <p className="wj-label">Required env</p>
              <p className="mt-1 break-words font-mono text-xs text-[rgba(0,0,0,0.72)]">
                {integration.requiredEnv.join(", ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutomationPath({ run }: { run?: WorkflowRun }) {
  return (
    <div className="wj-card">
      <div className="wj-card-header">
        <h2 className="text-sm font-semibold">Automation path</h2>
        <span className="rounded-full border border-[var(--wj-line)] px-2 py-1 text-xs font-semibold text-[rgba(0,0,0,0.58)]">
          Mock adapters
        </span>
      </div>
      <div className="divide-y divide-[var(--wj-line)]">
        {(run?.steps ?? fallbackSteps()).map((step) => (
          <StepRow key={step.key} step={step} />
        ))}
      </div>
    </div>
  );
}

function CreatorContext({ creator }: { creator?: CreatorProfile }) {
  return (
    <div className="wj-card p-4">
      <h2 className="text-sm font-semibold">Creator context</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Info label="Handle" value={creator?.handle ?? "Missing"} />
        <Info label="Audience" value={creator?.primaryAudience ?? "Missing"} />
        <Info label="BD owner" value={creator?.businessDevelopmentOwner ?? "Missing"} />
        <Info label="Executive sponsor" value={creator?.executiveSponsor ?? "Missing"} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <BulletList title="Launch inputs" items={creator?.launchNotes ?? []} />
        <BulletList title="Review flags" items={creator?.risks ?? []} />
      </div>
    </div>
  );
}

function ReadinessCard({ run }: { run?: WorkflowRun }) {
  return (
    <div className="wj-card p-4">
      <h2 className="text-sm font-semibold">Launch readiness</h2>
      <div className="mt-4 space-y-3">
        {(run?.readiness ?? []).length > 0 ? (
          run!.readiness.map((signal) => (
            <div className="flex items-start gap-3" key={signal.label}>
              {signal.status === "ready" ? (
                <ShieldCheck className="mt-0.5 size-4 text-[var(--wj-green)]" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 text-[var(--wj-amber)]" />
              )}
              <div>
                <p className="text-sm font-semibold">{signal.label}</p>
                <p className="mt-1 text-xs text-[rgba(0,0,0,0.58)]">{signal.detail}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-[rgba(0,0,0,0.58)]">Readiness signals appear after a kickoff run.</p>
        )}
      </div>
    </div>
  );
}

function NextActionsCard({ run }: { run?: WorkflowRun }) {
  return (
    <div className="wj-card p-4">
      <h2 className="text-sm font-semibold">Next actions</h2>
      <div className="mt-4 space-y-3">
        {(run?.nextActions ?? []).length > 0 ? (
          run!.nextActions.map((action) => (
            <a
              className="flex items-center justify-between gap-3 rounded border border-[var(--wj-line)] bg-[var(--wj-white)] px-3 py-3 text-sm transition hover:border-black hover:bg-white"
              href={action.href ?? "#"}
              key={action.id}
              rel="noreferrer"
              target="_blank"
            >
              <span>
                <span className="block font-semibold">{action.label}</span>
                <span className="mt-1 block text-xs text-[rgba(0,0,0,0.58)]">
                  {action.owner} · {new Date(action.dueAt).toLocaleDateString()}
                </span>
              </span>
              <ArrowUpRight className="size-4 text-[rgba(0,0,0,0.58)]" />
            </a>
          ))
        ) : (
          <p className="text-sm text-[rgba(0,0,0,0.58)]">Next actions appear after a kickoff run.</p>
        )}
      </div>
    </div>
  );
}

function ReviewPreview({ items }: { items: ReviewQueueItem[] }) {
  return (
    <div className="wj-card p-4">
      <h2 className="text-sm font-semibold">Review pressure</h2>
      <div className="mt-4 space-y-3">
        {items.slice(0, 3).map((item) => (
          <div className="border-l-2 border-black pl-3" key={item.id}>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-[rgba(0,0,0,0.58)]">
              {item.creatorName} · {item.owner}
            </p>
          </div>
        ))}
        {items.length === 0 ? <p className="text-sm text-[rgba(0,0,0,0.58)]">No open review items.</p> : null}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "coral" | "ink";
}) {
  const tones = {
    amber: "border-black bg-[var(--wj-white)]",
    coral: "border-black bg-black text-[var(--wj-white)]",
    green: "border-black bg-white",
    ink: "border-[var(--wj-line)] bg-white",
  };

  return (
    <div className={`rounded border p-4 ${tones[tone]}`}>
      <p className={`wj-label ${tone === "coral" ? "wj-invert-label" : ""}`}>{label}</p>
      <p className="mt-2 text-3xl font-extrabold leading-none">{value}</p>
    </div>
  );
}

function StepRow({ step }: { step: WorkflowStep }) {
  const Icon = stepIcons[step.key];

  return (
    <div className="grid grid-cols-[40px_1fr_auto] items-center gap-3 px-4 py-4">
      <div className="grid size-10 place-items-center rounded border border-[var(--wj-line)] bg-[var(--wj-white)]">
        <Icon className="size-5 text-black" />
      </div>
      <div>
        <p className="text-sm font-semibold">{step.label}</p>
        <p className="mt-1 text-xs text-[rgba(0,0,0,0.58)]">{step.message ?? "Waiting for kickoff trigger"}</p>
      </div>
      <StepStatusIcon status={step.status} />
    </div>
  );
}

function StepStatusIcon({ status }: { status: WorkflowStep["status"] }) {
  if (status === "completed") return <CheckCircle2 className="size-5 text-[var(--wj-green)]" />;
  if (status === "failed") return <AlertCircle className="size-5 text-[var(--wj-red)]" />;
  if (status === "running") return <RefreshCw className="size-5 animate-spin text-[var(--wj-blue)]" />;
  if (status === "skipped") return <Timer className="size-5 text-[rgba(0,0,0,0.42)]" />;
  return <CircleDashed className="size-5 text-[rgba(0,0,0,0.32)]" />;
}

function StatusPill({
  status,
}: {
  status: WorkflowRun["status"] | ReviewItem["status"] | IntegrationHealth["status"] | SourceEvent["status"];
}) {
  const style =
    status === "completed" || status === "approved" || status === "ready" || status === "processed"
      ? "border-[var(--wj-green)] text-[var(--wj-green)]"
      : status === "failed" || status === "blocked" || status === "misconfigured"
        ? "border-[var(--wj-red)] text-[var(--wj-red)]"
        : "border-[var(--wj-amber)] text-[var(--wj-amber)]";

  return <span className={`w-fit rounded-full border bg-white px-2 py-1 text-xs font-extrabold ${style}`}>{status}</span>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--wj-line)] bg-[var(--wj-white)] p-3">
      <p className="wj-label">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="wj-label block">{label}</span>
      <span className="mt-1 block text-xs text-[rgba(0,0,0,0.72)]">{value}</span>
    </span>
  );
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded border border-[var(--wj-line)] bg-[var(--wj-white)] p-3">
      <p className="wj-label">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li className="text-sm leading-5 text-[rgba(0,0,0,0.72)]" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArtifactLink({ artifact }: { artifact: WorkflowArtifact & { run?: WorkflowRun } }) {
  return (
    <a
      className="wj-card flex items-center justify-between gap-3 px-4 py-4 text-sm transition hover:border-black hover:bg-[var(--wj-white)]"
      href={artifact.url ?? "#"}
      rel="noreferrer"
      target="_blank"
    >
      <span>
        <span className="block font-semibold">{artifact.label}</span>
        <span className="mt-1 block text-xs text-[rgba(0,0,0,0.58)]">
          {artifact.kind}
          {artifact.run ? ` · ${artifact.run.creatorName}` : ""}
        </span>
      </span>
      <ArrowUpRight className="size-4 text-[rgba(0,0,0,0.58)]" />
    </a>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-4 py-10 text-sm text-[rgba(0,0,0,0.58)]">{text}</div>;
}

function fallbackSteps(): WorkflowStep[] {
  return [
    { key: "executive-email", label: "Executive kickoff email", status: "queued" },
    { key: "biz-dev-handoff", label: "Biz Dev handoff doc", status: "queued" },
    { key: "pod-assignment", label: "Pod assignment row", status: "queued" },
    { key: "asana-project", label: "Asana launch project", status: "queued" },
  ];
}

async function fetchDashboard(): Promise<DashboardState> {
  const response = await fetch("/api/dashboard");

  if (!response.ok) {
    throw new Error("Dashboard refresh failed");
  }

  return response.json() as Promise<DashboardState>;
}

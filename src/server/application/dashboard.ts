import { getIntegrationHealth } from "@/server/repositories/integration-store";
import {
  getOpenReviewItems,
  getRunSummaries,
  getSourceEvents,
} from "@/server/repositories/run-store";

export function getDashboardSnapshot() {
  const runs = getRunSummaries();
  const openReviewItems = getOpenReviewItems();
  const completedRuns = runs.filter((run) => run.status === "completed");
  const failedRuns = runs.filter((run) => run.status === "failed");
  const sourceEvents = getSourceEvents();
  const artifactsCreated = runs.reduce((count, run) => count + run.artifacts.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      totalRuns: runs.length,
      completedRuns: completedRuns.length,
      failedRuns: failedRuns.length,
      openReviewItems: openReviewItems.length,
      sourceEvents: sourceEvents.length,
      duplicateEvents: sourceEvents.reduce(
        (total, event) => total + (event.duplicateDeliveries ?? 0),
        0,
      ),
      artifactsCreated,
      automationCoverage: runs.length > 0 ? Math.round((completedRuns.length / runs.length) * 100) : 0,
    },
    runs,
    sourceEvents,
    openReviewItems,
    integrations: getIntegrationHealth(),
  };
}

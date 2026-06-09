import { getAppConfig } from "@/server/config";
import type { KickoffDependencies } from "@/server/ports";
import { createLiveDependencies } from "./live";
import { createMockDependencies } from "./mock";

export function createDefaultDependencies(): KickoffDependencies {
  return getAppConfig().integrationMode === "live"
    ? createLiveDependencies()
    : createMockDependencies();
}

import { getAppConfig } from "@/server/config";
import type { GoogleAutomationTokens } from "@/server/auth/google";
import type { KickoffDependencies } from "@/server/ports";
import { createLiveDependencies } from "./live";
import { createMockDependencies } from "./mock";

export type DependencyOptions = {
  googleTokens?: GoogleAutomationTokens;
};

export function createDefaultDependencies(options: DependencyOptions = {}): KickoffDependencies {
  return getAppConfig().integrationMode === "live"
    ? createLiveDependencies(options)
    : createMockDependencies();
}

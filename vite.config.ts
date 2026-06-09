import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID = "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

const localBindingConfig = {
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
          database_name: "warren-james-d1",
        },
      ]
    : [],
  main: "./worker/index.ts",
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "warren-james-r2",
        },
      ]
    : [],
};

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      config: localBindingConfig,
      viteEnvironment: { childEnvironments: ["ssr"], name: "rsc" },
    }),
  ],
});

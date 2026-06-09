import type { AsanaProjectInput } from "@/server/ports";
import { providerFetch } from "@/server/integrations/http";

type AsanaProjectResponse = {
  data?: {
    gid?: string;
    name?: string;
    permalink_url?: string;
  };
};

export async function createAsanaProjectFromTemplate(input: AsanaProjectInput) {
  const token = process.env.ASANA_ACCESS_TOKEN;
  const workspaceGid = process.env.ASANA_WORKSPACE_GID;
  const teamGid = process.env.ASANA_TEAM_GID;
  const templateGid = process.env.ASANA_TEMPLATE_GID;

  if (!token || !workspaceGid || !teamGid || !templateGid) {
    return null;
  }

  const response = await providerFetch(
    "asana",
    `https://app.asana.com/api/1.0/project_templates/${templateGid}/instantiateProject`,
    {
      body: JSON.stringify({
        data: {
          name: `${input.creator.name} Launch`,
          team: teamGid,
          workspace: workspaceGid,
          notes: [
            `Creator: ${input.creator.name} (${input.creator.handle})`,
            `Target launch date: ${input.creator.targetLaunchDate}`,
            input.handoffDocUrl ? `Handoff doc: ${input.handoffDocUrl}` : undefined,
            input.podAssignmentUrl ? `Pod assignment: ${input.podAssignmentUrl}` : undefined,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      }),
      headers: {
        authorization: `Bearer ${token}`,
      },
      method: "POST",
    },
  );

  return (await response.json()) as AsanaProjectResponse;
}

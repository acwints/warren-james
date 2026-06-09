import { redirect } from "next/navigation";
import { KickoffConsole } from "@/components/kickoff-console";
import { sampleCreators } from "@/data/sample-creators";
import { getGoogleSessionFromCookies } from "@/server/auth/google";
import { getDashboardSnapshot } from "@/server/application/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getGoogleSessionFromCookies();

  if (!session) {
    redirect("/");
  }

  return (
    <KickoffConsole
      creators={sampleCreators}
      initialDashboard={getDashboardSnapshot()}
      operator={session.user}
    />
  );
}

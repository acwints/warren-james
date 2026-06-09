import { KickoffConsole } from "@/components/kickoff-console";
import { sampleCreators } from "@/data/sample-creators";
import { getDashboardSnapshot } from "@/server/application/dashboard";

export default function Home() {
  return <KickoffConsole creators={sampleCreators} initialDashboard={getDashboardSnapshot()} />;
}
